import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { usePrivy } from '@privy-io/expo';
import { Alert, Linking, AppState, AppStateStatus } from 'react-native';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';
import type { Run, RunLocation } from '@/types/types';
import { setCurrentRunId, getCurrentRunId, clearCurrentRunId } from '@/lib/runContext';

const LOCATION_TASK_NAME = 'background-location-task';

const LOCATION_SETTINGS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
  timeInterval: 1000, // Update every second
  distanceInterval: 5, // Update every 5 meters
  activityType: Location.ActivityType.Fitness, // Optimize for fitness activities
  showsBackgroundLocationIndicator: true, // iOS only
  foregroundService: {
    notificationTitle: "Running in progress",
    notificationBody: "Recording your run location",
  },
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[]; };
    const currentRunId = getCurrentRunId();

    if (currentRunId && locations.length > 0) {
      const locationData: RunLocation[] = locations.map(location => ({
        run_id: currentRunId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        timestamp: Math.floor(location.timestamp), // Simplified timestamp handling
        speed: location.coords.speed,
      }));

      // Batch insert to reduce the number of write operations
      const { error: insertError } = await supabase
        .from('run_locations')
        .insert(locationData);

      if (insertError) {
        console.error('Error inserting location data:', insertError);
      }
    }
  }
});

export const useRecord = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segments, setSegments] = useState<RunLocation[][]>([]);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isReady } = usePrivy();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [hasFullPermissions, setHasFullPermissions] = useState(false);

  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0); // Incremental distance tracking

  const hasAttemptedPermissions = useRef(false);
  const justResumedRef = useRef(false);
  const prevLocationRef = useRef<RunLocation | null>(null); // To calculate incremental distance

  /**
   * Consolidated permission request and check.
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();

      let allGranted = foregroundStatus.granted && backgroundStatus.granted;
      if (allGranted) {
        setHasFullPermissions(true);
        return true;
      }

      // Request foreground permission if not granted
      if (!foregroundStatus.granted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (hasAttemptedPermissions.current) {
            Alert.alert(
              'Location Permission Required',
              'Please enable location permissions in your device settings to use this feature.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          return false;
        }
      }

      // Request background permission if not granted
      if (!backgroundStatus.granted) {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          if (hasAttemptedPermissions.current) {
            Alert.alert(
              'Background Location Required',
              'Please enable background location access in your device settings to track your entire run.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          return false;
        }
      }

      // Recheck permissions after requests
      const updatedForegroundStatus = await Location.getForegroundPermissionsAsync();
      const updatedBackgroundStatus = await Location.getBackgroundPermissionsAsync();
      allGranted = updatedForegroundStatus.granted && updatedBackgroundStatus.granted;
      setHasFullPermissions(allGranted);
      return allGranted;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(errorMsg);
      return false;
    } finally {
      hasAttemptedPermissions.current = true;
    }
  }, []);

  /**
   * Handle app state changes to check permissions dynamically.
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const allGranted = await requestPermissions();
        if (!allGranted && hasAttemptedPermissions.current) {
          setError('Background location access is still required. Please update your settings.');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (!isReady) {
      setError('Privy authentication failed.');
    } else {
      requestPermissions();
    }

    return () => {
      subscription.remove();
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      (async () => {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.error);
        }
      })();
    };
  }, [isReady, requestPermissions]);

  /**
   * Start recording a run.
   */
  const startRecording = useCallback(async () => {
    if (!user) {
      setError('You must be signed in to start recording a run.');
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert([
          {
            started_at: new Date().toISOString(),
            status: 'in_progress',
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (runError) throw runError;

      // Emit run started event
      runEvents.emit(RUN_EVENTS.RUN_STARTED, {
        runId: run.id,
        userId: user.id,
        started_at: run.started_at,
      });

      setCurrentRun(run);
      setSegments([[]]);
      setIsRecording(true);
      setIsPaused(false);
      setPauseStart(null);
      setTotalPausedTime(0);
      setTotalDistance(0); // Reset total distance

      setCurrentRunId(run.id);

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, LOCATION_SETTINGS);

      // Initialize previous location reference
      prevLocationRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while starting the run.');
    }
  }, [user, requestPermissions]);

  /**
   * Pause the ongoing run recording.
   */
  const pauseRecording = useCallback(async () => {
    if (!isRecording || isPaused || !currentRun) return;

    try {
      // Stop background location updates
      const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (taskExists) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.error);
      }

      setPauseStart(Date.now());
      setIsPaused(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause the recording.');
    }
  }, [isRecording, isPaused, currentRun]);

  /**
   * Resume a paused run recording.
   */
  const resumeRecording = useCallback(async () => {
    if (!isRecording || !isPaused || !currentRun) return;

    try {
      if (pauseStart !== null) {
        const pausedDuration = Date.now() - pauseStart;
        setTotalPausedTime(prev => prev + pausedDuration);
        setPauseStart(null);
      }

      justResumedRef.current = true;

      // Restart background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, LOCATION_SETTINGS);

      setIsPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume the recording.');
    }
  }, [isRecording, isPaused, currentRun, pauseStart]);

  /**
   * Finish the ongoing run recording.
   */
  const finishRecording = useCallback(async (): Promise<Run | null> => {
    try {
      if (!currentRun || !user) {
        setError('No active run to finish.');
        return null;
      }

      // Stop background location updates
      const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (taskExists) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.error);
      }

      // Get all locations for this run
      const { data: allLocations, error: locationsError } = await supabase
        .from('run_locations')
        .select('*')
        .eq('run_id', currentRun.id)
        .order('timestamp', { ascending: true });

      if (locationsError) throw locationsError;

      // Calculate metrics
      const distance = totalDistance; // Using incremental distance
      const duration = calculateDuration(currentRun.started_at, totalPausedTime);
      const avgSpeed = calculateAverageSpeed(distance, duration);
      const endTime = new Date().toISOString();

      // Update run in database
      const { data: updatedRun, error: updateError } = await supabase
        .from('runs')
        .update({
          ended_at: endTime,
          status: 'completed',
          distance_meters: distance,
          duration_seconds: duration,
          average_speed: avgSpeed,
        })
        .eq('id', currentRun.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Emit run completed event
      runEvents.emit(RUN_EVENTS.RUN_COMPLETED, {
        runId: currentRun.id,
        userId: user.id,
        distance_meters: distance,
        duration_seconds: duration,
        started_at: currentRun.started_at,
        ended_at: endTime,
      });

      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setCurrentRun(null);
      setSegments([]);
      setTotalDistance(0);

      clearCurrentRunId();

      return updatedRun;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while finishing the run.');
      return null;
    }
  }, [currentRun, user, totalDistance, totalPausedTime]);

  /**
   * Calculate the total duration excluding paused time.
   */
  const calculateDuration = (startTime: string, pausedTime: number = 0): number => {
    const totalTime = (Date.now() - new Date(startTime).getTime()) - pausedTime;
    return Math.max(Math.floor(totalTime / 1000), 0);
  };

  /**
   * Calculate average speed.
   */
  const calculateAverageSpeed = (distance: number, duration: number): number => {
    if (duration <= 0) return 0;
    return distance / duration;
  };

  /**
   * Format duration into HH:MM:SS.
   */
  const formatDuration = (startTime: string): string => {
    const seconds = calculateDuration(startTime, totalPausedTime);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Distance calculation using Haversine formula.
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  /**
   * Flat array of all location segments.
   */
  const flatLocations = segments.flat();

  return {
    isRecording,
    isPaused,
    locations: flatLocations,
    segments,
    currentRun,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    hasFullPermissions,
    calculateTotalDistance: () => totalDistance, // Exposed for potential UI components
    calculateDuration,
    formatDuration,
    calculateAverageSpeed,
  };
};
