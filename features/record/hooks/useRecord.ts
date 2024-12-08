import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase'; 
import { usePrivy } from '@privy-io/expo';

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

export const useRecord = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [locations, setLocations] = useState<RunLocation[]>([]);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert([
          {
            started_at: new Date().toISOString(),
            status: 'in_progress',
            user_id: 'GET_FROM_AUTH_CONTEXT',
          }
        ])
        .select()
        .single();

      if (runError) throw runError;
      
      setCurrentRun(run);
      setLocations([]);
      setIsRecording(true);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation: RunLocation = {
            run_id: run.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
          };

          setLocations(prev => [...prev, newLocation]);

          supabase
            .from('run_locations')
            .insert([newLocation])
            .then(({ error }) => {
              if (error) console.error('Error saving location:', error);
            });
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const stopRecording = async () => {
    try {
      if (!currentRun) return;

      const distance = calculateTotalDistance(locations);
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
        locs[i-1].latitude,
        locs[i-1].longitude,
        locs[i].latitude,
        locs[i].longitude
      );
    }
    return distance;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const calculateDuration = (startTime: string): number => {
    return Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
  };

  const calculateAverageSpeed = (distance: number, duration: number): number => {
    return distance / duration; // meters per second
  };

  return {
    isRecording,
    locations,
    currentRun,
    error,
    startRecording,
    stopRecording,
  };
};