import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, Animated } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRecord } from '../hooks/useRecord';
import { Icon } from '@/components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostRunModal } from './PostRunModal';
import type { Run } from '@/types/types';

import icons from '@/constants/icons';
import darkMapStyle from '@/constants/maps';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_HEIGHT = SCREEN_HEIGHT * (2.8 / 4);
const PANEL_HEIGHT = 0.5 * MAP_HEIGHT;

interface RecordScreenProps {
    closeMenu: () => void;
}

export const RecordScreen = ({ closeMenu }: RecordScreenProps) => {
    const mapRef = useRef<MapView>(null);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const intervalRef = useRef<NodeJS.Timeout>();
    const [showPostModal, setShowPostModal] = useState(false);
    const [completedRun, setCompletedRun] = useState<Run | null>(null);

    const {
        isRecording,
        isPaused,
        segments,
        error,
        startRecording,
        pauseRecording,
        resumeRecording,
        finishRecording,
        hasFullPermissions,
        calculateTotalDistance,
        formatDuration,
        calculateAverageSpeed,
        calculateDuration,
        currentRun
    } = useRecord();

    const [duration, setDuration] = useState('00:00:00');
    const [speed, setSpeed] = useState('0.0 km/h');
    const [distance, setDistance] = useState('0.00 km');

    const flatLocations = segments.flat();

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isRecording && currentRun ? 1 : 0,
            useNativeDriver: false,
            tension: 20,
            friction: 7,
        }).start();
    }, [isRecording, currentRun]);

    const [initialRegion, setInitialRegion] = useState<Region>({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);

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
        if (flatLocations.length > 0 && mapRef.current) {
            const lastLocation = flatLocations[flatLocations.length - 1];
            mapRef.current.animateToRegion({
                latitude: lastLocation.latitude,
                longitude: lastLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [flatLocations]);

    useEffect(() => {
        const updateStats = () => {
            if (isRecording && currentRun && !isPaused) {
                // Normal running state: update stats every second
                const totalDistance = calculateTotalDistance(flatLocations);
                // Convert kilometers to miles (1 km = 0.621371 miles)
                const milesDistance = (totalDistance / 1000 * 0.621371).toFixed(2);
                const currentDuration = formatDuration(currentRun.started_at);
                // Convert km/h to mph (1 km/h = 0.621371 mph)
                const currentSpeedVal = (calculateAverageSpeed(totalDistance, calculateDuration(currentRun.started_at)) * 3.6 * 0.621371).toFixed(1);

                setDuration(currentDuration);
                setDistance(`${milesDistance} mi`);
                setSpeed(`${currentSpeedVal} mph`);

            } else if (isRecording && isPaused && currentRun) {
                // Paused state: Only set once and do not update afterwards
                const totalDistance = calculateTotalDistance(flatLocations);
                const milesDistance = (totalDistance / 1000 * 0.621371).toFixed(2);
                const currentDuration = formatDuration(currentRun.started_at);

                setDuration(currentDuration);
                setDistance(`${milesDistance} mi`);
                // Speed remains whatever it was last set to before pausing
            } else {
                // Not recording or no run: reset to defaults
                setDuration('00:00:00');
                setDistance('0.00 mi');
                setSpeed('0.0 mph');
            }
        };

        // Clear any previous intervals
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (isRecording && currentRun && !isPaused) {
            // If running and not paused, update stats every second
            updateStats();
            intervalRef.current = setInterval(updateStats, 1000);
        } else {
            // If paused or not running, just do a single update and no interval
            updateStats();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRecording, isPaused, currentRun, flatLocations, formatDuration, calculateTotalDistance, calculateAverageSpeed, calculateDuration]);

    const handleMainButton = (): void => {
        if (!hasFullPermissions) return;

        if (!isRecording) {
            // Start the run
            startRecording();
        } else if (isRecording && !isPaused) {
            // Pause the run
            pauseRecording();
        }
    };

    const handleResume = () => {
        resumeRecording();
    };

    const handleFinish = async () => {
        try {
            const finishedRun = await finishRecording();
            if (finishedRun) {
                setCompletedRun(finishedRun);
                setShowPostModal(true);
            }
        } catch (error) {
            console.error('Error finishing run:', error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.leftItem}
                        onPress={closeMenu}
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

                <View style={styles.mapWrapper}>
                    <MapView
                        ref={mapRef as React.RefObject<MapView>}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={initialRegion}
                        showsUserLocation
                        showsMyLocationButton
                        customMapStyle={darkMapStyle}
                        // Add padding so that the location button isn't covered
                        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
                    >
                        {segments.map((segment, index) => (
                            segment.length > 1 && (
                                <Polyline
                                    key={index}
                                    coordinates={segment.map(loc => ({
                                        latitude: loc.latitude,
                                        longitude: loc.longitude,
                                    }))}
                                    strokeColor="#fff"
                                    strokeWidth={4}
                                />
                            )
                        ))}
                    </MapView>

                    {isLoadingLocation && (
                        <View style={styles.loadingOverlay}>
                            <Text>Getting your location...</Text>
                        </View>
                    )}

                    {locationError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{locationError}</Text>
                        </View>
                    )}

                    {!hasFullPermissions && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                Background location is required to track your run.
                            </Text>
                        </View>
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </View>

                <Animated.View
                    style={[
                        styles.statsPanel,
                        {
                            transform: [{
                                translateY: slideAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [PANEL_HEIGHT + 100, 0]
                                })
                            }]
                        }
                    ]}
                >
                    <View style={styles.statsGrid}>
                        <View style={styles.statItemTop}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValueTop}>{duration}</Text>
                        </View>
                        <View style={styles.bottomStatsRow}>
                            <View style={styles.statItemBottom}>
                                <Text style={styles.statLabel}>Speed</Text>
                                <Text style={styles.statValueBottom}>{speed}</Text>
                            </View>
                            <View style={styles.statItemBottom}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={styles.statValueBottom}>{distance}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                <View style={styles.buttonContainer}>
                    {isRecording && isPaused ? (
                        <View style={styles.pauseButtonsRow}>
                            <TouchableOpacity style={styles.pauseButton} onPress={handleResume}>
                                <Text style={styles.pauseButtonText}>Continue</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pauseButton} onPress={handleFinish}>
                                <Text style={styles.pauseButtonText}>Finish</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={handleMainButton}
                            disabled={!hasFullPermissions}
                        >
                            <Icon
                                icon={!isRecording ? icons.start : icons.stop}
                                onPress={handleMainButton}
                                label={!isRecording ? 'start' : 'pause'}
                                size={64}
                                color={
                                    !hasFullPermissions
                                        ? '#7D7D7D'
                                        : (!isRecording ? '#00F6FB' : '#FE205D')
                                }
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {showPostModal && completedRun && (
                <PostRunModal
                    visible={showPostModal}
                    onClose={() => {
                        setShowPostModal(false);
                        setCompletedRun(null);
                        closeMenu();
                    }}
                    run={completedRun}
                />
            )}
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
        backgroundColor: '#000',
    },
    menuContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        width: '100%',
        marginTop: 10,
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
    mapWrapper: {
        width: Dimensions.get('window').width,
        height: MAP_HEIGHT,
        backgroundColor: '#000',
        overflow: 'hidden',
        zIndex: 0,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
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
    statsPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: PANEL_HEIGHT,
        backgroundColor: '#000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 10,
    },
    statsGrid: {
        width: '100%',
    },
    statItemTop: {
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 20,
    },
    bottomStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    statItemBottom: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#666',
        fontSize: 14,
        marginBottom: 4,
    },
    statValueTop: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    statValueBottom: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        zIndex: 999,
    },
    pauseButtonsRow: {
        flexDirection: 'row',
    },
    pauseButton: {
        backgroundColor: '#00F6FB',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginHorizontal: 10,
    },
    pauseButtonText: {
        color: '#000',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
