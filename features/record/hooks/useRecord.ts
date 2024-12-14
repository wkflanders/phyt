import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { usePrivy } from '@privy-io/expo';
import { Alert, Linking, AppState, AppStateStatus } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

const LOCATION_SETTINGS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 25,
};

interface LocationTaskOptions extends Location.LocationTaskOptions {
  runId?: string;
}

interface RunLocation {
  run_id: string;
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
  ended_at?: string;
  status: 'in_progress' | 'completed';
  distance_meters?: number;
  duration_seconds?: number;
  average_speed?: number;
}

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

    if (currentRunId) {
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
  const [locations, setLocations] = useState<RunLocation[]>([]);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isReady } = usePrivy();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [hasFullPermissions, setHasFullPermissions] = useState(false);

  const hasAttemptedPermissions = useRef(false);

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

      // Check current permissions first
      let allGranted = await checkCurrentPermissions();
      if (allGranted) return true;

      // Request Foreground Permissions if not granted
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

      // Request Background Permissions if not granted
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

      // Final verification
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
        // When app becomes active, just check current permissions
        const allGranted = await checkCurrentPermissions();

        // If not granted and we've attempted before, set some error if desired
        if (!allGranted && hasAttemptedPermissions.current) {
          // You can set error or show UI message here
          setError('Background location access is still required. Please update your settings.');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (!isReady) {
      setError('Privy auth failed');
    } else {
      // On initial load, check current permissions
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
    if (!hasPermissions) {
      return;
    }

    try {
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert([
          {
            started_at: new Date().toISOString(),
            status: 'in_progress',
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (runError) throw runError;

      setCurrentRun(run);
      setLocations([]);
      setIsRecording(true);

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

          setLocations(prev => [...prev, newLocation]);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const stopRecording = async () => {
    try {
      if (!currentRun) return;

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
        // Ignore E_TASK_NOT_FOUND errors
        if (!(err instanceof Error) || !err.message?.includes('E_TASK_NOT_FOUND')) {
          console.error('Error stopping location updates:', err);
        }
      }

      const { data: allLocations, error: locationsError } = await supabase
        .from('run_locations')
        .select('*')
        .eq('run_id', currentRun.id)
        .order('timestamp', { ascending: true });

      if (locationsError) throw locationsError;

      const distance = calculateTotalDistance(allLocations);
      const duration = calculateDuration(currentRun.started_at);
      const avgSpeed = calculateAverageSpeed(distance, duration);

      const { error: updateError } = await supabase
        .from('runs')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
          distance_meters: distance,
          duration_seconds: duration,
          average_speed: avgSpeed,
        })
        .eq('id', currentRun.id);

      if (updateError) throw updateError;

      setIsRecording(false);
      setCurrentRun(null);
      setLocations([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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

  const calculateDuration = (startTime: string): number => {
    return Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
  };

  const calculateAverageSpeed = (distance: number, duration: number): number => {
    return distance / duration;
  };

  return {
    isRecording,
    locations,
    currentRun,
    error,
    startRecording,
    stopRecording,
    hasFullPermissions,
  };
};
