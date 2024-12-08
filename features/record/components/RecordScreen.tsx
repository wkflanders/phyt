import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRecord } from '../hooks/useRecord';

interface RunLocation {
    run_id: string;
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: number;
    speed: number | null;
}

export const RecordScreen: React.FC = () => {
    const mapRef = useRef<MapView | null>(null);
    const {
        isRecording,
        locations,
        error,
        startRecording,
        stopRecording
    } = useRecord();

    const [initialRegion, setInitialRegion] = React.useState<Region | null>(null);

    useEffect(() => {
        const getInitialLocation = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const region: Region = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            setInitialRegion(region);
        };

        getInitialLocation();
    }, []);

    useEffect(() => {
        if (locations.length > 0 && mapRef.current) {
            const lastLocation = locations[locations.length - 1];
            mapRef.current.animateToRegion({
                latitude: lastLocation.latitude,
                longitude: lastLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [locations]);

    const handleRecord = (): void => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    if (!initialRegion) {
        return (
            <View style={styles.container}>
                <Text>Loading map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton
                followsUserLocation
            >
                {locations.length > 0 && (
                    <Polyline
                        coordinates={locations.map(loc => ({
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                        }))}
                        strokeColor="#000"
                        strokeWidth={4}
                    />
                )}
            </MapView>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {isRecording && (
                <View style={styles.statsOverlay}>
                    <Text style={styles.statsText}>
                        Distance: {(calculateTotalDistance(locations) / 1000).toFixed(2)} km
                    </Text>
                    <Text style={styles.statsText}>
                        Duration: {formatDuration(locations)}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.recordButton,
                    isRecording ? styles.recordingButton : styles.notRecordingButton
                ]}
                onPress={handleRecord}
            >
                <Text style={styles.buttonText}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    recordButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    notRecordingButton: {
        backgroundColor: '#4CAF50',
    },
    recordingButton: {
        backgroundColor: '#f44336',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        padding: 10,
        borderRadius: 5,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
    },
    statsOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statsText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// Helper functions
const calculateTotalDistance = (locations: RunLocation[]): number => {
    let distance = 0;
    for (let i = 1; i < locations.length; i++) {
        const prevLoc = locations[i - 1];
        const currLoc = locations[i];
        distance += haversineDistance(
            prevLoc.latitude,
            prevLoc.longitude,
            currLoc.latitude,
            currLoc.longitude
        );
    }
    return distance;
};

const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3; // Earth's radius in meters
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

const formatDuration = (locations: RunLocation[]): string => {
    if (locations.length < 1) return '0:00';
    const startTime = locations[0].timestamp;
    const endTime = locations[locations.length - 1].timestamp;
    const seconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};