import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { usePrivy } from '@privy-io/expo';
import { Alert, Linking, AppState, AppStateStatus, Platform } from 'react-native';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';
import type { Run, RunLocation } from '@/types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the task name
const LOCATION_TASK_NAME = 'background-location-task';

// Define AsyncStorage key
const CURRENT_RUN_ID_KEY = 'CURRENT_RUN_ID';

// Define location task options
const LOCATION_SETTINGS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000, // Update every second
  distanceInterval: 5, // Update every 5 meters
  activityType: Location.ActivityType.Fitness,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "Running in progress",
    notificationBody: "Recording your run location",
    notificationColor: '#00F6FB',
  },
};

// Define the background task within the hook
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Task Error:', error);
    return;
  }

  if (!data) {
    console.warn('No data received in background task');
    return;
  }

  try {
    const { locations } = data as { locations: Location.LocationObject[]; };
    const currentRunId = await AsyncStorage.getItem(CURRENT_RUN_ID_KEY);

    if (!currentRunId) {
      console.warn('No current run ID found in background task');
      return;
    }

    if (locations.length === 0) {
      console.warn('No locations received in background task');
      return;
    }

    const locationData: RunLocation[] = locations.map(location => ({
      run_id: currentRunId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      timestamp: Math.floor(location.timestamp),
      speed: location.coords.speed,
    }));

    const { error: insertError } = await supabase
      .from('run_locations')
      .insert(locationData);

    if (insertError) {
      console.error('Error saving background locations:', insertError);
    }
  } catch (err) {
    console.error('Background task error:', err);
  }
});

export const useRecord = () => {
  // State Variables
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segments, setSegments] = useState<RunLocation[][]>([]);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isReady } = usePrivy();

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const hasAttemptedPermissions = useRef(false);
  const justResumedRef = useRef(false);
  const prevLocationRef = useRef<RunLocation | null>(null);

  // Additional State Variables
  const [hasFullPermissions, setHasFullPermissions] = useState(false);
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);

  // Request Permissions
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

      if (!foregroundStatus.granted) {
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

      if (!backgroundStatus.granted) {
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

      allGranted = (await Location.getForegroundPermissionsAsync()).granted &&
        (await Location.getBackgroundPermissionsAsync()).granted;
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

  // Handle App State Changes
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
      setError('Authentication failed');
    } else {
      requestPermissions();
    }

    return () => {
      subscription.remove();
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      (async () => {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
        } catch (err) {
          console.error('Error cleaning up location task:', err);
        }
      })();
    };
  }, [isReady, requestPermissions]);

  // Calculate Distance Between Two Points (Haversine Formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Start Recording
  const startRecording = useCallback(async () => {
    if (!user) {
      setError('You must be signed in to start recording.');
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      // Insert new run into Supabase
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

      // Emit run started event
      runEvents.emit(RUN_EVENTS.RUN_STARTED, {
        runId: run.id,
        userId: user.id,
        started_at: run.started_at
      });

      // Update state
      setCurrentRun(run);
      setSegments([[]]);
      setIsRecording(true);
      setIsPaused(false);
      setPauseStart(null);
      setTotalPausedTime(0);
      setTotalDistance(0);
      prevLocationRef.current = null;

      // Persist the run ID using AsyncStorage
      await AsyncStorage.setItem(CURRENT_RUN_ID_KEY, run.id);

      // Start background location updates
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus.granted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, LOCATION_SETTINGS);
      } else {
        console.warn('Background permissions not granted. Running in foreground only.');
      }

      // Start foreground location subscription
      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_SETTINGS,
        (location) => {
          const newLocation: RunLocation = {
            run_id: run.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: Math.floor(location.timestamp),
            speed: location.coords.speed,
          };

          setSegments(prev => {
            const updated = [...prev];
            if (justResumedRef.current) {
              justResumedRef.current = false;
              return [...prev, [newLocation]];
            }
            updated[updated.length - 1].push(newLocation);
            return updated;
          });

          if (prevLocationRef.current) {
            const incrementalDistance = calculateDistance(
              prevLocationRef.current.latitude,
              prevLocationRef.current.longitude,
              newLocation.latitude,
              newLocation.longitude
            );
            setTotalDistance(prev => prev + incrementalDistance);
          }
          prevLocationRef.current = newLocation;
        }
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      console.error('Error starting recording:', err);
    }
  }, [user, requestPermissions]);

  // Pause Recording
  const pauseRecording = useCallback(async () => {
    if (!isRecording || isPaused || !currentRun) return;

    try {
      // Remove foreground subscription
      if (locationSubscription.current) {
        await locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      // Stop background location updates
      const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (taskExists) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Record pause start time
      setPauseStart(Date.now());
      setIsPaused(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause recording');
      console.error('Error pausing recording:', err);
    }
  }, [isRecording, isPaused, currentRun]);

  // Resume Recording
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
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus.granted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, LOCATION_SETTINGS);
      } else {
        console.warn('Background permissions not granted. Running in foreground only.');
      }

      // Restart foreground location subscription
      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_SETTINGS,
        (location) => {
          const newLocation: RunLocation = {
            run_id: currentRun.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: Math.floor(location.timestamp),
            speed: location.coords.speed,
          };

          setSegments(prev => {
            if (justResumedRef.current) {
              justResumedRef.current = false;
              return [...prev, [newLocation]];
            }
            const updated = [...prev];
            updated[updated.length - 1].push(newLocation);
            return updated;
          });

          if (prevLocationRef.current) {
            const incrementalDistance = calculateDistance(
              prevLocationRef.current.latitude,
              prevLocationRef.current.longitude,
              newLocation.latitude,
              newLocation.longitude
            );
            setTotalDistance(prev => prev + incrementalDistance);
          }
          prevLocationRef.current = newLocation;
        }
      );

      setIsPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume recording');
      console.error('Error resuming recording:', err);
    }
  }, [isRecording, isPaused, currentRun, pauseStart]);

  // Finish Recording
  const finishRecording = useCallback(async (): Promise<Run | null> => {
    if (!currentRun || !user) return null;

    try {
      // Remove foreground subscription
      if (locationSubscription.current) {
        await locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      // Stop background location updates
      const taskExists = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (taskExists) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Calculate duration and average speed
      const duration = calculateDuration(currentRun.started_at, totalPausedTime);
      const avgSpeed = calculateAverageSpeed(totalDistance, duration);
      const endTime = new Date().toISOString();

      // Update run in Supabase
      const { data: updatedRun, error: updateError } = await supabase
        .from('runs')
        .update({
          ended_at: endTime,
          status: 'completed',
          distance_meters: totalDistance,
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
        distance_meters: totalDistance,
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
      prevLocationRef.current = null;

      // Clear persisted run ID
      await AsyncStorage.removeItem(CURRENT_RUN_ID_KEY);

      return updatedRun;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish recording');
      console.error('Error finishing recording:', err);
      return null;
    }
  }, [currentRun, user, totalDistance, totalPausedTime]);

  // Calculate Duration in Seconds
  const calculateDuration = (startTime: string, pausedTime: number = 0): number => {
    const totalTime = Date.now() - new Date(startTime).getTime() - pausedTime;
    return Math.max(Math.floor(totalTime / 1000), 0);
  };

  // Calculate Average Speed (meters per second)
  const calculateAverageSpeed = (distance: number, duration: number): number => {
    if (duration <= 0) return 0;
    return distance / duration; // meters per second
  };

  // Format Duration as HH:MM:SS
  const formatDuration = (startTime: string): string => {
    const seconds = calculateDuration(startTime, totalPausedTime);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate Total Distance (meters)
  const getTotalDistance = useCallback((): number => {
    return totalDistance;
  }, [totalDistance]);

  // Get Flat Array of Locations
  const flatLocations = segments.flat();

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (locationSubscription.current) {
            await locationSubscription.current.remove();
            locationSubscription.current = null;
          }

          const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      })();
    };
  }, []);

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
    calculateTotalDistance: getTotalDistance,
    calculateDuration,
    formatDuration,
    calculateAverageSpeed,
  };
};
