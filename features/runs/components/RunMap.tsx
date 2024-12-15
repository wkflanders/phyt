// components/RunMap.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRunData } from '@/features/runs/hooks/useRunData';

interface RunMapProps {
    runId: string;
    height?: number;
}

export function RunMap({ runId, height = 300 }: RunMapProps) {
    const { loadRunDetails, calculateRouteBounds } = useRunData("");
    const [runData, setRunData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mapRegion, setMapRegion] = useState<Region | undefined>();

    useEffect(() => {
        const loadRoute = async () => {
            try {
                const data = await loadRunDetails(runId);
                setRunData(data);
                if (data.route && data.route.length > 0) {
                    const bounds = calculateRouteBounds(data.route);
                    if (bounds) {
                        setMapRegion(bounds);
                    }
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

    return (
        <MapView
            provider={PROVIDER_GOOGLE}
            style={{ height }}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
        >
            <Polyline
                coordinates={runData.route.map((loc: any) => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                }))}
                strokeColor="#00F6FB"
                strokeWidth={3}
            />
        </MapView>
    );
}