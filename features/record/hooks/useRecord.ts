import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { usePrivy } from '@privy-io/expo';
import { Alert, Linking, AppState, AppStateStatus } from 'react-native';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';
import type { Run, RunLocation, LocationTaskOptions } from '@/types/types';

const LOCATION_TASK_NAME = 'background-location-task';

const LOCATION_SETTINGS = {
  accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
  timeInterval: 1000, // Update every second
  distanceInterval: 5, // Update every 5 meters
  activityType: Location.ActivityType.Fitness, // Optimize for fitness activities
  showsBackgroundLocationIndicator: true, // iOS only
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[]; };
    const currentRunId = await TaskManager.getTaskOptionsAsync(LOCATION_TASK_NAME)
      .then(options => (options as LocationTaskOptions)?.runId)
      .catch(() => null);

    if (currentRunId && locations.length > 0) {
      const locationData: RunLocation[] = locations.map(location => ({
        run_id: currentRunId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        timestamp: parseInt(Math.floor(location.timestamp).toString(), 10),
        speed: location.coords.speed,
      }));

      await supabase
        .from('run_locations')
        .insert(locationData)
        .then(({ error }) => {
          if (error) console.error('Error saving background locations:', error);
        });
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

  const hasAttemptedPermissions = useRef(false);
  const justResumedRef = useRef(false);

  const lastKnownStatsRef = useRef<{ duration: string; speed: string; distance: string; }>({
    duration: '00:00:00',
    speed: '0.0 km/h',
    distance: '0.00 km'
  });

  const checkCurrentPermissions = async () => {
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    const backgroundStatus = await Location.getBackgroundPermissionsAsync();

    const allGranted = foregroundStatus.granted && backgroundStatus.granted;
    setHasFullPermissions(allGranted);

    return allGranted;
  };

  const requestPermissions = async () => {
    try {
      setError(null);
      let allGranted = await checkCurrentPermissions();
      if (allGranted) return true;

      let fgStatus = await Location.getForegroundPermissionsAsync();
      if (!fgStatus.granted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (hasAttemptedPermissions.current) {
            Alert.alert(
              'Location Permission Required',
              'Please enable location permissions in your device settings to use this feature.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return false;
        }
      }

      let bgStatus = await Location.getBackgroundPermissionsAsync();
      if (!bgStatus.granted) {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          if (hasAttemptedPermissions.current) {
            Alert.alert(
              'Background Location Required',
              'Please enable background location access in your device settings to track your entire run.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return false;
        }
      }

      allGranted = await checkCurrentPermissions();
      return allGranted;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(errorMsg);
      return false;
    } finally {
      hasAttemptedPermissions.current = true;
    }
  };

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const allGranted = await checkCurrentPermissions();
        if (!allGranted && hasAttemptedPermissions.current) {
          setError('Background location access is still required. Please update your settings.');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (!isReady) {
      setError('Privy auth failed');
    } else {
      checkCurrentPermissions();
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
  }, [isReady]);

  const startRecording = async () => {
    if (!user) {
      setError('Not signed in');
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert([{
          started_at: new Date().toISOString(),
          status: 'in_progress',
          user_id: user.id,
        }])
        .select()
        .single();

      if (runError) throw runError;

      // Emit start event
      runEvents.emit(RUN_EVENTS.RUN_STARTED, {
        runId: run.id,
        userId: user.id,
        started_at: run.started_at
      });

      setCurrentRun(run);
      setSegments([[]]);
      setIsRecording(true);
      setIsPaused(false);
      setPauseStart(null);
      setTotalPausedTime(0);

      // Start location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        ...LOCATION_SETTINGS,
        foregroundService: {
          notificationTitle: "Running in progress",
          notificationBody: "Recording your run location",
        },
        runId: run.id,
      } as LocationTaskOptions);

      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_SETTINGS,
        (location) => {
          const newLocation: RunLocation = {
            run_id: run.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: parseInt(Math.floor(location.timestamp).toString(), 10),
            speed: location.coords.speed,
          };
          setSegments(prev => {
            const updated = [...prev];
            updated[updated.length - 1].push(newLocation);
            return updated;
          });
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const pauseRecording = async () => {
    if (!isRecording || isPaused || !currentRun) return;
    if (locationSubscription.current) {
      await locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (taskExists) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.error);
    }

    setPauseStart(Date.now());
    setIsPaused(true);
  };

  const resumeRecording = async () => {
    if (!isRecording || !isPaused || !currentRun) return;

    if (pauseStart !== null) {
      const pausedDuration = Date.now() - pauseStart;
      setTotalPausedTime(prev => prev + pausedDuration);
      setPauseStart(null);
    }

    justResumedRef.current = true;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      ...LOCATION_SETTINGS,
      foregroundService: {
        notificationTitle: "Running in progress",
        notificationBody: "Recording your run location",
      },
      runId: currentRun.id,
    } as LocationTaskOptions);

    locationSubscription.current = await Location.watchPositionAsync(
      LOCATION_SETTINGS,
      (location) => {
        const newLocation: RunLocation = {
          run_id: currentRun.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          timestamp: parseInt(Math.floor(location.timestamp).toString(), 10),
          speed: location.coords.speed,
        };

        if (justResumedRef.current) {
          justResumedRef.current = false;
          setSegments(prev => [...prev, [newLocation]]);
        } else {
          setSegments(prev => {
            const updated = [...prev];
            updated[updated.length - 1].push(newLocation);
            return updated;
          });
        }
      }
    );

    setIsPaused(false);
  };

  const finishRecording = async () => {
    try {
      if (!currentRun || !user) return null;

      // Cleanup location tracking
      if (locationSubscription.current) {
        await locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      try {
        const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (taskExists) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      } catch (err) {
        if (!(err instanceof Error) || !err.message?.includes('E_TASK_NOT_FOUND')) {
          console.error('Error stopping location updates:', err);
        }
      }

      // Get all locations for this run
      const { data: allLocations, error: locationsError } = await supabase
        .from('run_locations')
        .select('*')
        .eq('run_id', currentRun.id)
        .order('timestamp', { ascending: true });

      if (locationsError) throw locationsError;

      const distance = calculateTotalDistance(allLocations);
      const duration = calculateDuration(currentRun.started_at, totalPausedTime);
      const avgSpeed = calculateAverageSpeed(distance, duration);
      const endTime = new Date().toISOString();

      // Update run in database and get the updated run data
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

      // Emit completion event
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

      return updatedRun;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  };

  const calculateTotalDistance = (locs: RunLocation[]): number => {
    let distance = 0;
    for (let i = 1; i < locs.length; i++) {
      distance += calculateDistance(
        locs[i - 1].latitude,
        locs[i - 1].longitude,
        locs[i].latitude,
        locs[i].longitude
      );
    }
    return distance;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const calculateDuration = (startTime: string, pausedTime: number = 0): number => {
    const totalTime = (Date.now() - new Date(startTime).getTime()) - pausedTime;
    return Math.max(Math.floor(totalTime / 1000), 0);
  };

  const calculateAverageSpeed = (distance: number, duration: number): number => {
    if (duration <= 0) return 0;
    return distance / duration;
  };

  const formatDuration = (startTime: string): string => {
    const seconds = calculateDuration(startTime, totalPausedTime);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
    calculateTotalDistance,
    calculateDuration,
    formatDuration,
    calculateAverageSpeed
  };
};
