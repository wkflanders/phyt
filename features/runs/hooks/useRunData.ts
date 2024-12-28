import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { runEvents, RUN_EVENTS, type RunCompletedEvent } from '@/lib/runEvents';
import {
    Run, RunLocation, RunStats, DailyActivity
} from '@/types/types';

// Define LngLatBoundsLike locally as it's not exported from @rnmapbox/maps
type LngLatBoundsLike = [[number, number], [number, number]];

export function useRunData(userId: string) {
    const [recentRuns, setRecentRuns] = useState<Run[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>([]);
    const [monthlyActivity, setMonthlyActivity] = useState<DailyActivity[]>([]);
    const [stats, setStats] = useState<RunStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Basic helpers with memoization
    const helpers = useMemo(() => ({
        toMiles: (meters: number): number => meters / 1609.34,
        calculatePace: (meters: number, seconds: number): number =>
            seconds / 60 / (meters / 1609.34),
        formatPace: (pace: number): string => {
            const minutes = Math.floor(pace);
            const seconds = Math.round((pace - minutes) * 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }), []);

    const loadRunDetails = useCallback(async (runId: string) => {
        try {
            // Try cache first
            const cachedRun = await cache.get('run', runId);
            if (cachedRun) return cachedRun;

            const { data, error: runError } = await supabase
                .rpc('get_run_details', { p_run_id: runId });

            if (runError) throw runError;
            if (!data) throw new Error('Run not found');

            // Cache the run data
            await cache.set('run', runId, data);

            return data;
        } catch (err) {
            console.error('Error loading run details:', err);
            throw err;
        }
    }, []);

    const loadStats = useCallback(async (forceRefresh = false) => {
        try {
            // Try cache first unless forcing refresh
            if (!forceRefresh) {
                const cachedStats = await cache.get('user_stats', userId);
                if (cachedStats) return cachedStats;
            }

            const { data, error: statsError } = await supabase
                .rpc('get_user_run_stats', { p_user_id: userId });

            if (statsError) throw statsError;

            // Cache the stats
            await cache.set('user_stats', userId, data);

            return data;
        } catch (err) {
            console.error('Error loading stats:', err);
            throw err;
        }
    }, [userId]);

    const calculateRouteBounds = useCallback((locations: RunLocation[]): LngLatBoundsLike | undefined => {
        if (!locations?.length) return undefined;

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

        const paddingFactor = 0.1; // 10% padding
        const latDelta = (maxLat - minLat) * (1 + paddingFactor);
        const lngDelta = (maxLng - minLng) * (1 + paddingFactor);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        const bounds: LngLatBoundsLike = [
            [minLng - (lngDelta - (maxLng - minLng)) / 2, minLat - (latDelta - (maxLat - minLat)) / 2],
            [maxLng + (lngDelta - (maxLng - minLng)) / 2, maxLat + (latDelta - (maxLat - minLat)) / 2]
        ];

        return bounds;
    }, []);

    const getLastThreeMonthsData = useCallback(() => {
        return stats?.monthly_stats || [];
    }, [stats]);

    // Run completed handler
    const handleRunCompleted = useCallback((event: RunCompletedEvent) => {
        if (event.userId !== userId) return;

        setStats(prev => {
            if (!prev?.total_stats) return prev;
            const distance = helpers.toMiles(event.distance_meters);

            return {
                ...prev,
                total_stats: {
                    ...prev.total_stats,
                    total_runs: prev.total_stats.total_runs + 1,
                    total_distance: prev.total_stats.total_distance + distance,
                    total_duration: prev.total_stats.total_duration + event.duration_seconds,
                    longest_run: Math.max(prev.total_stats.longest_run, distance),
                    average_speed: (
                        prev.total_stats.total_distance / prev.total_stats.total_duration
                    ) * 0.44704 // Convert m/s to mph
                }
            };
        });

        // Invalidate caches
        cache.invalidate('user_stats', userId);
        cache.invalidate('run', event.runId);
    }, [userId, helpers]);

    // Load all data
    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const data = await loadStats(forceRefresh);

            setStats(data);
            setWeeklyActivity(data.weekly_stats || []);
            setMonthlyActivity(data.monthly_stats || []);
            setRecentRuns(data.recent_runs || []);

        } catch (err) {
            console.error('Error loading run data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load run data');
        } finally {
            setLoading(false);
        }
    }, [loadStats]);

    // Initial load and event subscription
    useEffect(() => {
        loadData();

        // Subscribe to run events
        runEvents.on(RUN_EVENTS.RUN_COMPLETED, handleRunCompleted);

        return () => {
            runEvents.off(RUN_EVENTS.RUN_COMPLETED, handleRunCompleted);
        };
    }, [loadData, handleRunCompleted]);

    return {
        recentRuns,
        weeklyActivity,
        monthlyActivity,
        stats,
        loading,
        error,
        refresh: (forceRefresh = false) => loadData(forceRefresh),
        loadRunDetails,
        calculateRouteBounds,
        helpers,
        getLastThreeMonthsData
    };
}
