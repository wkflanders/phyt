import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    parseISO,
    differenceInMinutes,
} from 'date-fns';
import { Region } from 'react-native-maps';
import debounce from 'lodash/debounce';
import { runEvents, RUN_EVENTS, RunCompletedEvent } from '@/lib/runEvents';

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

export interface DailyActivity {
    date: string;
    distance: number;
    duration: number;
    runs: number;
}

export interface RunStats {
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
    const [weeklyElevationGain, setWeeklyElevationGain] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cache management
    const getFromCache = async (key: string): Promise<any | null> => {
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

    const setToCache = async (key: string, data: any): Promise<void> => {
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

    // Memoize expensive calculations
    const toMiles = useCallback((meters: number): number => meters / 1609.34, []);
    const calculatePace = useCallback((meters: number, seconds: number): number =>
        seconds / 60 / toMiles(meters), [toMiles]);

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

        locations.forEach((loc: RunLocation) => {
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

    // Fetch recent runs
    const fetchRecentRuns = async (): Promise<Run[]> => {
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

            await setToCache(cacheKey, runs);
            return runs || [];
        } catch (err) {
            throw new Error('Failed to fetch recent runs');
        }
    };

    // Load run details with route
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
                        return data as Run;
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

    // Fetch runs within a date range
    const fetchRunsInRange = async (startDate: Date, endDate: Date): Promise<Run[]> => {
        try {
            const { data: runs, error } = await supabase
                .from('runs')
                .select('*, run_locations(altitude)')
                .eq('user_id', userId)
                .gte('started_at', startDate.toISOString())
                .lte('started_at', endDate.toISOString());

            if (error) throw error;

            return runs || [];
        } catch (err) {
            throw new Error('Failed to fetch runs in range');
        }
    };

    // Calculate daily activity
    const calculateActivity = async (startDate: Date, endDate: Date): Promise<DailyActivity[]> => {
        try {
            const runs = await fetchRunsInRange(startDate, endDate);

            const days = eachDayOfInterval({ start: startDate, end: endDate });
            const dailyData: DailyActivity[] = days.map(day => ({
                date: format(day, 'yyyy-MM-dd'),
                distance: 0,
                duration: 0,
                runs: 0,
            }));

            runs.forEach(run => {
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

    // Calculate weekly elevation gain
    const calculateWeeklyElevationGain = (weeklyRuns: Run[]): number => {
        let elevationGain = 0;

        weeklyRuns.forEach((run: Run) => {
            if (run.route && run.route.length > 1) {
                for (let i = 1; i < run.route.length; i++) {
                    const prevAltitude = run.route[i - 1].altitude;
                    const currentAltitude = run.route[i].altitude;
                    if (prevAltitude !== null && currentAltitude !== null) {
                        const diff = currentAltitude - prevAltitude;
                        if (diff > 0) elevationGain += diff;
                    }
                }
            }
        });

        return elevationGain;
    };

    // Calculate overall statistics
    const calculateStats = useCallback(async (): Promise<RunStats | null> => {
        try {
            const runs = await fetchRunsInRange(new Date('1970-01-01'), new Date());

            if (!runs.length) return null;

            const totalDistance = runs.reduce((sum, run) => sum + run.distance_meters, 0);
            const totalDuration = runs.reduce((sum, run) => sum + run.duration_seconds, 0);
            const paces = runs.map(run => calculatePace(run.distance_meters, run.duration_seconds));

            // Calculate total elevation gain across all runs
            const totalElevationGain = calculateWeeklyElevationGain(runs);

            return {
                totalRuns: runs.length,
                totalDistance: toMiles(totalDistance),
                totalDuration,
                averagePace: totalDuration / (totalDistance / 1609.34) / 60, // minutes per mile
                longestRun: toMiles(Math.max(...runs.map(run => run.distance_meters))),
                fastestPace: Math.min(...paces),
                totalElevationGain,
            };
        } catch (err) {
            throw new Error('Failed to calculate stats');
        }
    }, [calculatePace, toMiles]);

    const getLastThreeMonthsData = (): { month: string; distance: number[]; }[] => {
        const currentDate = new Date();

        const lastThreeMonths = Array.from({ length: 3 }).map((_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (2 - i), 1);
            const month = format(date, 'MMM'); // e.g., "Oct"

            const startOfMonthDate = startOfMonth(date);
            const endOfMonthDate = endOfMonth(date);
            const days = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
            const numIntervals = 3; // 2-3 data points per month
            const intervalSize = Math.ceil(days.length / numIntervals);

            const distances = Array.from({ length: numIntervals }).map((_, j) => {
                const start = j * intervalSize;
                const end = start + intervalSize;

                const daysInInterval = days.slice(start, end);
                const totalDistance = daysInInterval.reduce((sum, day) => {
                    const activity = weeklyActivity.find(
                        act => format(parseISO(act.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    );
                    return sum + (activity ? activity.distance : 0);
                }, 0);

                return totalDistance;
            });

            return { month, distance: distances };
        });

        return lastThreeMonths;
    };

    // Centralized data loading logic with improved caching
    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const now = new Date();
            const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
            const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
            const currentMonthStart = startOfMonth(now);
            const currentMonthEnd = endOfMonth(now);

            // Parallel data fetching with optional force refresh
            const [
                recentRunsData,
                weeklyData,
                monthlyData,
                statsData,
                weeklyRuns
            ] = await Promise.all([
                forceRefresh
                    ? fetchRecentRuns()
                    : (await getFromCache(CACHE_KEYS.RECENT_RUNS(userId))) || fetchRecentRuns(),
                forceRefresh
                    ? calculateActivity(currentWeekStart, currentWeekEnd)
                    : (await getFromCache(CACHE_KEYS.WEEKLY(userId))) ||
                    calculateActivity(currentWeekStart, currentWeekEnd),
                forceRefresh
                    ? calculateActivity(currentMonthStart, currentMonthEnd)
                    : (await getFromCache(CACHE_KEYS.MONTHLY(userId))) ||
                    calculateActivity(currentMonthStart, currentMonthEnd),
                forceRefresh
                    ? calculateStats()
                    : (await getFromCache(CACHE_KEYS.STATS(userId))) || calculateStats(),
                fetchRunsInRange(currentWeekStart, currentWeekEnd)
            ]);

            // Minimize state updates by comparing existing data
            setRecentRuns(prev =>
                JSON.stringify(prev) !== JSON.stringify(recentRunsData) ? recentRunsData : prev
            );

            setWeeklyActivity(prev =>
                JSON.stringify(prev) !== JSON.stringify(weeklyData) ? weeklyData : prev
            );

            setMonthlyActivity(prev =>
                JSON.stringify(prev) !== JSON.stringify(monthlyData) ? monthlyData : prev
            );

            setStats(prev =>
                JSON.stringify(prev) !== JSON.stringify(statsData) ? statsData : prev
            );

            // Calculate weekly elevation gain
            const elevationGain = calculateWeeklyElevationGain(weeklyRuns);
            setWeeklyElevationGain(prev =>
                prev !== elevationGain ? elevationGain : prev
            );

            // Cache updated data
            await Promise.all([
                setToCache(CACHE_KEYS.RECENT_RUNS(userId), recentRunsData),
                setToCache(CACHE_KEYS.WEEKLY(userId), weeklyData),
                setToCache(CACHE_KEYS.MONTHLY(userId), monthlyData),
                setToCache(CACHE_KEYS.STATS(userId), statsData)
            ]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId, calculateStats, calculateActivity, fetchRecentRuns]);

    // Debounced load data to prevent rapid successive calls
    const debouncedLoadData = useMemo(
        () => debounce(loadData, 1000),
        [loadData]
    );

    // Memoized run completed handler
    const handleRunCompleted = useCallback((event: RunCompletedEvent) => {
        if (event.userId !== userId) return;

        setStats(prev => {
            if (!prev) return null;

            const newDistance = toMiles(event.distance_meters);
            const newTotalDistance = prev.totalDistance + newDistance;
            const newTotalDuration = prev.totalDuration + event.duration_seconds;

            // Precise float comparison with small tolerance
            const areStatsSignificantlyDifferent =
                Math.abs(prev.totalDistance - newTotalDistance) > 0.01 ||
                Math.abs(prev.totalDuration - newTotalDuration) > 1;

            if (!areStatsSignificantlyDifferent) return prev;

            return {
                ...prev,
                totalRuns: prev.totalRuns + 1,
                totalDistance: newTotalDistance,
                totalDuration: newTotalDuration,
                longestRun: Math.max(prev.longestRun, newDistance),
                averagePace: newTotalDuration / (newTotalDistance * 60)
            };
        });

        // Only trigger full refresh if no stats exist
        if (!stats) {
            debouncedLoadData(true);
        }
    }, [userId, stats, toMiles]);

    // Controlled effect with explicit dependencies
    useEffect(() => {
        const controller = new AbortController();

        // Only load data if we don't have it
        if (!stats) {
            loadData();
        }

        // Subscribe to run events
        runEvents.on(RUN_EVENTS.RUN_COMPLETED, handleRunCompleted);

        return () => {
            controller.abort();
            runEvents.off(RUN_EVENTS.RUN_COMPLETED, handleRunCompleted);
            debouncedLoadData.cancel();
        };
    }, [userId, loadData, handleRunCompleted, stats]);

    // Helpers with memoization
    const helpers = useMemo(() => ({
        toMiles,
        calculatePace,
        formatPace: (pace: number): string => {
            const minutes = Math.floor(pace);
            const seconds = Math.round((pace - minutes) * 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },
        getLastThreeMonthsData
    }), [toMiles, calculatePace]);

    return {
        recentRuns,
        weeklyActivity,
        monthlyActivity,
        stats,
        weeklyElevationGain,
        loading,
        error,
        refresh: (forceRefresh = false) => loadData(forceRefresh),
        loadRunDetails,
        fetchRunRoute,
        calculateRouteBounds,
        helpers,
    };
}