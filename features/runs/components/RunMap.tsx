import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRunData } from '@/features/runs/hooks/useRunData';
import darkMapStyle from '@/constants/maps';
import type { RunLocation } from '@/types/types';

interface RunMapProps {
    runId: string;
    height?: number;
}

interface RouteLocation {
    latitude: number;
    longitude: number;
}

export function RunMap({ runId, height = 300 }: RunMapProps) {
    const { loadRunDetails } = useRunData(runId);
    const [runData, setRunData] = useState<{ route: RunLocation[]; } | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapRegion, setMapRegion] = useState<Region | undefined>();

    const calculateRouteBounds = (locations: RunLocation[]): Region => {
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

        // Calculate the route's diagonal distance in degrees
        const diagonalDist = Math.sqrt(
            Math.pow(maxLat - minLat, 2) + Math.pow(maxLng - minLng, 2)
        );

        // Dynamic padding based on route length
        const padding = Math.max(diagonalDist * 0.2, 0.001);

        return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) + padding, 0.002),
            longitudeDelta: Math.max((maxLng - minLng) + padding, 0.002),
        };
    };

    useEffect(() => {
        const loadRoute = async () => {
            try {
                const data = await loadRunDetails(runId);
                setRunData(data);
                if (data.route && data.route.length > 0) {
                    const bounds = calculateRouteBounds(data.route);
                    setMapRegion(bounds);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadRoute();
    }, [runId]);

    if (loading || !runData?.route || !mapRegion) {
        return (
            <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#00F6FB" />
            </View>
        );
    }

    const routeCoordinates: RouteLocation[] = runData.route.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
    }));

    const startPoint = routeCoordinates[0];
    const endPoint = routeCoordinates[routeCoordinates.length - 1];

    return (
        <MapView
            provider={PROVIDER_GOOGLE}
            style={{ height }}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            customMapStyle={darkMapStyle}
            mapPadding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
            <Polyline
                coordinates={routeCoordinates}
                strokeColor="#00F6FB"
                strokeWidth={3}
            />
        </MapView>
    );
}