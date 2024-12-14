import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRecord } from '../hooks/useRecord';
import { Icon } from '@/components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import icons from '@/constants/icons';
import darkMapStyle from '@/constants/maps';

interface RunLocation {
    run_id: string;
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: number;
    speed: number | null;
}

interface RecordScreenProps {
    closeMenu: () => void;
}

export const RecordScreen = ({ closeMenu }: RecordScreenProps) => {
    const mapRef = useRef<MapView>(null);
    const {
        isRecording,
        locations,
        error,
        startRecording,
        stopRecording,
        hasFullPermissions,
    } = useRecord(); // Access hasFullPermissions

    const [initialRegion, setInitialRegion] = React.useState<Region>({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [isLoadingLocation, setIsLoadingLocation] = React.useState(true);
    const [locationError, setLocationError] = React.useState<string | null>(null);

    useEffect(() => {
        const getInitialLocation = async () => {
            try {
                setIsLoadingLocation(true);
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationError('Permission to access location was denied');
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const region: Region = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };

                setInitialRegion(region);
                mapRef.current?.animateToRegion(region, 1000);
            } catch (err) {
                setLocationError('Failed to get location');
                console.error(err);
            } finally {
                setIsLoadingLocation(false);
            }
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.leftItem}
                        onPress={() => {
                            closeMenu();
                        }}
                    >
                        <Text style={styles.rightText}>Close</Text>
                    </TouchableOpacity>

                    <View style={styles.centerItem}>
                        <Text className="font-interbold text-xl" style={styles.centerText}>Run</Text>
                    </View>

                    <TouchableOpacity style={styles.rightItem}>
                        <Icon
                            icon={icons.settings}
                            onPress={() => { }}
                            label={'settings'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Map Container */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef as React.RefObject<MapView>}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={initialRegion}
                        showsUserLocation
                        showsMyLocationButton
                        customMapStyle={darkMapStyle}
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

                    {/* Loading Overlay */}
                    {isLoadingLocation && (
                        <View style={styles.loadingOverlay}>
                            <Text>Getting your location...</Text>
                        </View>
                    )}

                    {/* Location Error Overlay */}
                    {locationError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{locationError}</Text>
                        </View>
                    )}

                    {/* Display UI message if background permission not granted */}
                    {!hasFullPermissions && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                Background location is required to track your run.
                            </Text>
                        </View>
                    )}

                    {/* General Error Overlay */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </View>

                {/* Stats Overlay */}
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

                {/* Record Button */}
                <TouchableOpacity
                    onPress={handleRecord}
                    disabled={!hasFullPermissions}
                >
                    <Icon
                        icon={isRecording ? icons.stop : icons.start}
                        onPress={handleRecord}
                        label={isRecording ? 'stop' : 'start'}
                        size={64}
                        color={!hasFullPermissions
                            ? '#7D7D7D'
                            : (isRecording ? '#FE205D' : '#00F6FB')}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20, // Changed from padding to paddingHorizontal
        justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
        alignItems: 'center',
    },
    menuContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        width: '100%',
        marginTop: 10, // Add some space from the top if needed
    },
    leftItem: {
        flex: 1,
        alignItems: 'flex-start',
    },
    centerItem: {
        flex: 1,
        alignItems: 'center',
    },
    centerText: {
        color: '#fff'
    },
    rightItem: {
        flex: 1,
        alignItems: 'flex-end',
    },
    rightText: {
        color: '#fff',
    },
    mapContainer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * (2.8 / 4),
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 20,
    },
    map: {
        flex: 1,
    },
    errorContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        padding: 10,
        borderRadius: 5,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
    },
    statsOverlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statsText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -50 }, { translateY: -10 }],
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
});

// Utility Functions

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

const formatDuration = (locations: RunLocation[]): string => {
    if (locations.length < 1) return '0:00';
    const startTime = locations[0].timestamp;
    const endTime = locations[locations.length - 1].timestamp;
    const seconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
