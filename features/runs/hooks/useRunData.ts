import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, differenceInMinutes } from 'date-fns';
import { Region } from 'react-native-maps';

// Types
interface RunLocation {
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: number;
    speed: number | null;
}

interface Run {
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string;
    distance_meters: number;
    duration_seconds: number;
    title: string;
    route?: RunLocation[];
}

interface DailyActivity {
    date: string;
    distance: number;
    duration: number;
    runs: number;
}

interface RunStats {
    totalRuns: number;
    totalDistance: number;
    totalDuration: number;
    averagePace: number;
    longestRun: number;
    fastestPace: number;
    totalElevationGain: number;
}

interface CacheData {
    timestamp: number;
    data: any;
}

// Cache keys and expiration
const CACHE_KEYS = {
    RECENT_RUNS: (userId: string) => `@runs_recent_${userId}`,
    WEEKLY: (userId: string) => `@runs_weekly_${userId}`,
    MONTHLY: (userId: string) => `@runs_monthly_${userId}`,
    STATS: (userId: string) => `@runs_stats_${userId}`,
    RUN_ROUTE: (runId: string) => `@run_route_${runId}`,
};
const CACHE_EXPIRATION = 5; // minutes

export function useRunData(userId: string) {
    const [recentRuns, setRecentRuns] = useState<Run[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>([]);
    const [monthlyActivity, setMonthlyActivity] = useState<DailyActivity[]>([]);
    const [stats, setStats] = useState<RunStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cache management
    const getFromCache = async (key: string) => {
        try {
            const cached = await AsyncStorage.getItem(key);
            if (!cached) return null;

            const { timestamp, data }: CacheData = JSON.parse(cached);
            const isExpired = differenceInMinutes(new Date(), new Date(timestamp)) > CACHE_EXPIRATION;

            return isExpired ? null : data;
        } catch (err) {
            console.error('Cache read error:', err);
            return null;
        }
    };

    const setToCache = async (key: string, data: any) => {
        try {
            const cacheData: CacheData = {
                timestamp: Date.now(),
                data,
            };
            await AsyncStorage.setItem(key, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Cache write error:', err);
        }
    };

    // Helper functions
    const toMiles = (meters: number) => meters / 1609.34;
    const calculatePace = (meters: number, seconds: number) => seconds / 60 / toMiles(meters);

    // Fetch run route data
    const fetchRunRoute = async (runId: string): Promise<RunLocation[]> => {
        const cacheKey = CACHE_KEYS.RUN_ROUTE(runId);
        const cached = await getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const { data, error } = await supabase
                .from('run_locations')
                .select('*')
                .eq('run_id', runId)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            await setToCache(cacheKey, data);
            return data || [];
        } catch (err) {
            throw new Error('Failed to fetch run route');
        }
    };

    // Calculate route bounds for map
    const calculateRouteBounds = (locations: RunLocation[]): Region | undefined => {
        if (!locations || locations.length === 0) {
            return undefined;
        }

        let minLat = locations[0].latitude;
        let maxLat = locations[0].latitude;
        let minLng = locations[0].longitude;
        let maxLng = locations[0].longitude;

        locations.forEach(loc => {
            minLat = Math.min(minLat, loc.latitude);
            maxLat = Math.max(maxLat, loc.latitude);
            minLng = Math.min(minLng, loc.longitude);
            maxLng = Math.max(maxLng, loc.longitude);
        });

        const padding = 0.1; // 10% padding for the map view
        const latDelta = (maxLat - minLat) * (1 + padding);
        const lngDelta = (maxLng - minLng) * (1 + padding);

        return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
            longitudeDelta: Math.max(lngDelta, 0.01),
        };
    };

    // Enhanced fetch recent runs with routes
    const fetchRecentRuns = async () => {
        const cacheKey = CACHE_KEYS.RECENT_RUNS(userId);
        const cached = await getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const { data: runs, error: runsError } = await supabase
                .from('runs')
                .select('*')
                .eq('user_id', userId)
                .order('started_at', { ascending: false })
                .limit(10);

            if (runsError) throw runsError;

            // Don't fetch routes here to keep it fast
            await setToCache(cacheKey, runs);
            return runs || [];
        } catch (err) {
            throw new Error('Failed to fetch recent runs');
        }
    };

    // Load single run with route
    const loadRunDetails = async (runId: string): Promise<Run & { route: RunLocation[]; }> => {
        try {
            const [runData, routeData] = await Promise.all([
                supabase
                    .from('runs')
                    .select('*')
                    .eq('id', runId)
                    .single()
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data;
                    }),
                fetchRunRoute(runId),
            ]);

            return {
                ...runData,
                route: routeData,
            };
        } catch (err) {
            throw new Error('Failed to load run details');
        }
    };

    const calculateActivity = async (startDate: Date, endDate: Date) => {
        try {
            const { data: runs, error: runsError } = await supabase
                .from('runs')
                .select('*')
                .eq('user_id', userId)
                .gte('started_at', startDate.toISOString())
                .lte('started_at', endDate.toISOString());

            if (runsError) throw runsError;

            const days = eachDayOfInterval({ start: startDate, end: endDate });
            const dailyData = days.map(day => ({
                date: format(day, 'yyyy-MM-dd'),
                distance: 0,
                duration: 0,
                runs: 0,
            }));

            runs?.forEach(run => {
                const runDate = format(parseISO(run.started_at), 'yyyy-MM-dd');
                const dayData = dailyData.find(d => d.date === runDate);
                if (dayData) {
                    dayData.distance += toMiles(run.distance_meters);
                    dayData.duration += run.duration_seconds;
                    dayData.runs += 1;
                }
            });

            return dailyData;
        } catch (err) {
            throw new Error('Failed to calculate activity');
        }
    };

    // Calculate overall statistics
    const calculateStats = async () => {
        try {
            const { data: runs, error: runsError } = await supabase
                .from('runs')
                .select('*')
                .eq('user_id', userId);

            if (runsError) throw runsError;

            if (!runs?.length) return null;

            const totalDistance = runs.reduce((sum, run) => sum + run.distance_meters, 0);
            const totalDuration = runs.reduce((sum, run) => sum + run.duration_seconds, 0);
            const paces = runs.map(run => calculatePace(run.distance_meters, run.duration_seconds));

            return {
                totalRuns: runs.length,
                totalDistance: toMiles(totalDistance),
                totalDuration,
                averagePace: totalDuration / (totalDistance / 1609.34) / 60, // minutes per mile
                longestRun: toMiles(Math.max(...runs.map(run => run.distance_meters))),
                fastestPace: Math.min(...paces),
            };
        } catch (err) {
            throw new Error('Failed to calculate stats');
        }
    };
    // Load all data
    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const [
                recentRunsData,
                weeklyData,
                monthlyData,
                statsData
            ] = await Promise.all([
                forceRefresh ? fetchRecentRuns() : getFromCache(CACHE_KEYS.RECENT_RUNS(userId)) || fetchRecentRuns(),
                forceRefresh ? calculateActivity(
                    startOfWeek(new Date(), { weekStartsOn: 1 }),
                    endOfWeek(new Date(), { weekStartsOn: 1 })
                ) : getFromCache(CACHE_KEYS.WEEKLY(userId)) || calculateActivity(
                    startOfWeek(new Date(), { weekStartsOn: 1 }),
                    endOfWeek(new Date(), { weekStartsOn: 1 })
                ),
                forceRefresh ? calculateActivity(
                    startOfMonth(new Date()),
                    endOfMonth(new Date())
                ) : getFromCache(CACHE_KEYS.MONTHLY(userId)) || calculateActivity(
                    startOfMonth(new Date()),
                    endOfMonth(new Date())
                ),
                forceRefresh ? calculateStats() : getFromCache(CACHE_KEYS.STATS(userId)) || calculateStats(),
            ]);

            setRecentRuns(recentRunsData);
            setWeeklyActivity(weeklyData);
            setMonthlyActivity(monthlyData);
            setStats(statsData);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        recentRuns,
        weeklyActivity,
        monthlyActivity,
        stats,
        loading,
        error,
        refresh: (forceRefresh = false) => loadData(forceRefresh),
        loadRunDetails,
        fetchRunRoute,
        calculateRouteBounds,
        helpers: {
            toMiles,
            calculatePace,
            formatPace: (pace: number) => {
                const minutes = Math.floor(pace);
                const seconds = Math.round((pace - minutes) * 60);
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            },
        },
    };
}