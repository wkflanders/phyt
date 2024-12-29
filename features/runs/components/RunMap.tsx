// RunMap.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useRunData } from '@/features/runs/hooks/useRunData';
import darkMapStyle from '@/constants/maps';
import type { RunLocation } from '@/types/types';
import { Geometry, GeoJsonProperties, Feature } from 'geojson';

// Define LngLatBoundsLike locally
type LngLatBoundsLike = [[number, number], [number, number]];

interface RunMapProps {
    runId: string;
    height?: number;
}

export function RunMap({ runId, height = 300 }: RunMapProps) {
    const { loadRunDetails, error } = useRunData(runId);
    const [runData, setRunData] = useState<{ route: RunLocation[]; } | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapBounds, setMapBounds] = useState<LngLatBoundsLike | undefined>();

    // Function to calculate Mapbox bounds
    const calculateRouteBounds = (locations: RunLocation[]): LngLatBoundsLike => {
        if (!locations.length) {
            // Default bounds if no locations are provided
            return [
                [-180, -90],
                [180, 90],
            ];
        }

        let minLat = locations[0].latitude;
        let maxLat = locations[0].latitude;
        let minLng = locations[0].longitude;
        let maxLng = locations[0].longitude;

        locations.forEach((loc) => {
            minLat = Math.min(minLat, loc.latitude);
            maxLat = Math.max(maxLat, loc.latitude);
            minLng = Math.min(minLng, loc.longitude);
            maxLng = Math.max(maxLng, loc.longitude);
        });

        const paddingFactor = 0.1; // 10% padding
        const latDelta = (maxLat - minLat) * (1 + paddingFactor);
        const lngDelta = (maxLng - minLng) * (1 + paddingFactor);

        const paddedMinLat = minLat - (latDelta - (maxLat - minLat)) / 2;
        const paddedMaxLat = maxLat + (latDelta - (maxLat - minLat)) / 2;
        const paddedMinLng = minLng - (lngDelta - (maxLng - minLng)) / 2;
        const paddedMaxLng = maxLng + (lngDelta - (maxLng - minLng)) / 2;

        return [
            [paddedMinLng, paddedMinLat],
            [paddedMaxLng, paddedMaxLat],
        ];
    };

    useEffect(() => {
        const loadRoute = async () => {
            try {
                const data = await loadRunDetails(runId);
                if (!data.route || data.route.length === 0) {
                    console.warn('No route data found for runId:', runId);
                }
                setRunData(data);
                if (data.route && data.route.length > 0) {
                    const bounds = calculateRouteBounds(data.route);
                    setMapBounds(bounds);
                }
            } catch (err) {
                console.error('Error loading run details:', err);
            } finally {
                setLoading(false);
            }
        };

        loadRoute();
    }, [runId, loadRunDetails]);

    // Show loading if data not available yet
    if (loading || !runData?.route || !mapBounds) {
        return (
            <View style={[styles.loadingContainer, { height }]}>
                <ActivityIndicator color="#00F6FB" />
                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        );
    }

    // If there's only one location, we can't draw a line, but we can mark it on the map
    const hasMultiplePoints = runData.route.length >= 2;

    // Create a minimal GeoJSON line only if there are >=2 points
    let routeGeoJSON: Feature<Geometry, GeoJsonProperties> | null = null;
    if (hasMultiplePoints) {
        routeGeoJSON = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: runData.route.map((loc) => [loc.longitude, loc.latitude]),
            },
            properties: {},
        };
    }

    const startPoint = runData.route[0];
    const endPoint = runData.route[runData.route.length - 1];

    return (
        <View style={{ height }}>
            <MapboxGL.MapView
                style={styles.map}
                styleURL={darkMapStyle}
                logoEnabled={false}
                attributionEnabled={false}
                zoomEnabled={false}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                compassEnabled={false}
                onPress={() => { }}
            >
                {/* Camera to fit the route bounds */}
                {mapBounds && (
                    <MapboxGL.Camera
                        bounds={{
                            ne: mapBounds[1],
                            sw: mapBounds[0],
                        }}
                        animationDuration={1000}
                        animationMode="flyTo"
                    />
                )}

                {/* Render the route if multiple points exist */}
                {hasMultiplePoints && routeGeoJSON && (
                    <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
                        <MapboxGL.LineLayer
                            id="routeFill"
                            style={{
                                lineColor: '#00F6FB',
                                lineWidth: 3,
                                lineCap: MapboxGL.LineJoin.Round,
                                lineJoin: MapboxGL.LineJoin.Round,
                            }}
                        />
                    </MapboxGL.ShapeSource>
                )}

                {/* Start Point Marker (first location) */}
                {startPoint && (
                    <MapboxGL.PointAnnotation
                        id="startPoint"
                        coordinate={[startPoint.longitude, startPoint.latitude]}
                    >
                        <View style={styles.startMarker} />
                    </MapboxGL.PointAnnotation>
                )}

                {/* End Point Marker (last location) */}
                {/* If there's only one point, startPoint === endPoint but we can still display it */}
                {endPoint && (
                    <MapboxGL.PointAnnotation
                        id="endPoint"
                        coordinate={[endPoint.longitude, endPoint.latitude]}
                    >
                        <View style={styles.endMarker} />
                    </MapboxGL.PointAnnotation>
                )}
            </MapboxGL.MapView>
            <View style={StyleSheet.absoluteFill} pointerEvents="none" />

        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000', // Optional: to match the dark map style
    },
    map: {
        flex: 1,
    },
    startMarker: {
        width: 12,
        height: 12,
        backgroundColor: '#4CAF50',
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
    },
    endMarker: {
        width: 12,
        height: 12,
        backgroundColor: '#F44336',
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
        marginTop: 10,
    },
});
