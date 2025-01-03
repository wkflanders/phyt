import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
    Animated,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { useRecord } from '../hooks/useRecord';
import { Icon } from '@/components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostRunModal } from './PostRunModal';
import type { Run } from '@/types/types';
import icons from '@/constants/icons';
import { trafficMapStyle } from '@/constants/maps';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_HEIGHT = SCREEN_HEIGHT * (2.8 / 4);
const PANEL_HEIGHT = 0.5 * MAP_HEIGHT;

interface RecordScreenProps {
    closeMenu: () => void;
}

export const RecordScreen = ({ closeMenu }: RecordScreenProps) => {
    const mapRef = useRef<MapboxGL.MapView>(null);
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showPostModal, setShowPostModal] = useState(false);
    const [completedRun, setCompletedRun] = useState<Run | null>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout>();

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
        currentRun,
        locations,
    } = useRecord();

    const [duration, setDuration] = useState('00:00:00');
    const [speed, setSpeed] = useState('0.0 mph');
    const [distance, setDistance] = useState('0.00 mi');

    const flatLocations = locations;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isRecording && currentRun ? 1 : 0,
            useNativeDriver: true,
            tension: 20,
            friction: 7,
        }).start();
    }, [isRecording, currentRun]);

    const [initialCamera, setInitialCamera] = useState({
        centerCoordinate: [-122.4324, 37.78825],
        zoomLevel: 14,
        animationDuration: 1000,
    });
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Initialize map with user's location
    useEffect(() => {
        const getInitialLocation = async () => {
            try {
                setIsLoadingLocation(true);
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationError('Permission to access location was denied');
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const coordinate: [number, number] = [
                    location.coords.longitude,
                    location.coords.latitude,
                ];

                setInitialCamera({
                    centerCoordinate: coordinate,
                    zoomLevel: 16,
                    animationDuration: 1000,
                });

                cameraRef.current?.setCamera({
                    centerCoordinate: coordinate,
                    zoomLevel: 16,
                    animationDuration: 1000,
                });
            } catch (err) {
                setLocationError('Failed to get location');
                console.error(err);
            } finally {
                setIsLoadingLocation(false);
            }
        };

        getInitialLocation();
    }, []);

    // Center map on latest location
    useEffect(() => {
        if (flatLocations.length > 0 && cameraRef.current && isRecording && !isPaused) {
            const lastLocation = flatLocations[flatLocations.length - 1];
            const coordinate: [number, number] = [
                lastLocation.longitude,
                lastLocation.latitude,
            ];
            cameraRef.current.setCamera({
                centerCoordinate: coordinate,
                zoomLevel: 16,
                animationDuration: 1000,
            });
        }
    }, [flatLocations, isRecording, isPaused]);

    // Update stats (duration, speed, distance) periodically
    useEffect(() => {
        const updateStats = () => {
            if (isRecording && currentRun) {
                const totalDistanceMeters = calculateTotalDistance();
                const totalDistanceMiles = (totalDistanceMeters * 0.000621371).toFixed(2);
                const currentDuration = formatDuration(currentRun.started_at);

                // Convert speed from m/s to mph
                const speedMetersPerSecond = calculateAverageSpeed(
                    totalDistanceMeters,
                    calculateDuration(currentRun.started_at)
                );
                const speedMph = (speedMetersPerSecond * 2.23694).toFixed(1);

                if (!isPaused) {
                    setDuration(currentDuration);
                    setDistance(`${totalDistanceMiles} mi`);
                    setSpeed(`${speedMph} mph`);
                }
            } else {
                setDuration('00:00:00');
                setDistance('0.00 mi');
                setSpeed('0.0 mph');
            }
        };

        // Clear any existing interval
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
        }

        // Start new interval if recording and not paused
        if (isRecording && !isPaused) {
            updateStats(); // Initial update
            statsIntervalRef.current = setInterval(updateStats, 1000);
        } else {
            // Single update for paused state
            updateStats();
        }

        // Cleanup interval on unmount or state change
        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, [
        isRecording,
        isPaused,
        currentRun,
        calculateTotalDistance,
        formatDuration,
        calculateAverageSpeed,
        calculateDuration,
    ]);

    const handleMainButton = useCallback((): void => {
        if (!hasFullPermissions) {
            Alert.alert(
                'Permissions Required',
                'Please enable location permissions in your device settings to use this feature.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (!isRecording) {
            startRecording();
        } else if (isRecording && !isPaused) {
            pauseRecording();
        }
    }, [hasFullPermissions, isRecording, isPaused, startRecording, pauseRecording]);

    const handleResume = useCallback(() => {
        resumeRecording();
    }, [resumeRecording]);

    const handleFinish = useCallback(async () => {
        try {
            const finishedRun = await finishRecording();
            if (finishedRun) {
                setCompletedRun(finishedRun);
                setShowPostModal(true);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while finishing the run.');
            console.error('Error finishing run:', error);
        }
    }, [finishRecording]);

    const renderPolylines = useCallback(() => {
        if (segments.length === 0) return null;

        const geojson: FeatureCollection<Geometry, GeoJsonProperties> = {
            type: 'FeatureCollection',
            features: segments.map((segment) => ({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: segment.map((loc) => [loc.longitude, loc.latitude]),
                },
                properties: {},
            })),
        };

        return (
            <MapboxGL.ShapeSource id="lineSource" shape={geojson}>
                <MapboxGL.LineLayer
                    id="lineLayer"
                    style={{
                        lineColor: '#00F6FB',
                        lineWidth: 4,
                        lineJoin: 'round',
                        lineCap: 'round',
                    }}
                />
            </MapboxGL.ShapeSource>
        );
    }, [segments]);

    const renderMainButton = useCallback(() => {
        if (isRecording && isPaused) {
            return (
                <View style={styles.pauseButtonsRow}>
                    <TouchableOpacity style={styles.pauseButton} onPress={handleResume}>
                        <Text style={styles.pauseButtonText}>Continue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pauseButton} onPress={handleFinish}>
                        <Text style={styles.pauseButtonText}>Finish</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <TouchableOpacity onPress={handleMainButton} disabled={!hasFullPermissions}>
                <Icon
                    icon={!isRecording ? icons.start : icons.stop}
                    onPress={handleMainButton}
                    label={!isRecording ? 'start' : 'pause'}
                    size={64}
                    color={
                        !hasFullPermissions
                            ? '#7D7D7D'
                            : !isRecording
                                ? '#00F6FB'
                                : '#FE205D'
                    }
                />
            </TouchableOpacity>
        );
    }, [isRecording, isPaused, hasFullPermissions, handleMainButton, handleResume, handleFinish]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.leftItem} onPress={closeMenu}>
                        <Text style={styles.rightText}>Close</Text>
                    </TouchableOpacity>

                    <View style={styles.centerItem}>
                        <Text style={styles.centerText}>Run</Text>
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
                    <MapboxGL.MapView
                        ref={mapRef}
                        style={styles.map}
                        styleURL={trafficMapStyle}
                        logoEnabled={false}
                        compassEnabled={false}
                        zoomEnabled={true}
                        scrollEnabled={true}
                        pitchEnabled={true}
                        rotateEnabled={true}
                    >
                        <MapboxGL.Camera
                            ref={cameraRef}
                            centerCoordinate={initialCamera.centerCoordinate}
                            zoomLevel={initialCamera.zoomLevel}
                            animationDuration={initialCamera.animationDuration}
                        />

                        <MapboxGL.UserLocation visible={true} />

                        {renderPolylines()}
                    </MapboxGL.MapView>

                    {isLoadingLocation && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#00F6FB" />
                            <Text style={styles.loadingText}>Getting your location...</Text>
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
                            transform: [
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [PANEL_HEIGHT + 100, 0],
                                    }),
                                },
                            ],
                        },
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
                    {renderMainButton()}
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
        color: '#fff',
        fontFamily: 'Inter-Bold',
        fontSize: 20,
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
    loadingText: {
        marginTop: 10,
        color: '#000',
        fontSize: 16,
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
        padding: 20,
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