import { useRef, useMemo, useCallback } from 'react';

import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import icons from '@/constants/icons';
import { BottomSheetView, BottomSheetModalProvider, BottomSheetModal, useBottomSheetModal } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RecordScreen } from '@/features/record/components/RecordScreen';

export const RecordScreenModal = () => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { dismiss } = useBottomSheetModal();

    const handleRecordPress = useCallback(() => {
        bottomSheetModalRef.current?.present();
    }, []);

    const handleDismiss = useCallback(() => {
        dismiss();
    }, [dismiss]);

    const snapPoints = useMemo(() => ['100'], []);

    return (
        <>
            <View style={{
                flex: 1,
                alignItems: 'center',
                height: Dimensions.get('window').height,
                paddingBottom: 50,
            }}
            >
                <TouchableOpacity
                    onPress={handleRecordPress}
                >
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 60,
                        paddingTop: 10
                    }}>
                        <Image
                            source={icons.run}
                            resizeMode="contain"
                            style={{
                                tintColor: '#7D7D7D',
                                width: 24,
                                height: 24,
                                marginBottom: 5,
                            }}
                        />
                        <Text
                            style={{
                                color: '#7D7D7D',
                                fontSize: 12,
                                fontWeight: '400',
                            }}
                            className="font-intersemibold"
                        >
                            Record
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
            <BottomSheetModal
                ref={bottomSheetModalRef}
                backgroundStyle={{
                    backgroundColor: 'black'
                }}
                snapPoints={snapPoints}
                index={0}
                enablePanDownToClose={false}
                enableDismissOnClose={true}
                enableOverDrag={false}
                enableDynamicSizing={false}
                onDismiss={handleDismiss}
                handleStyle={{
                    display: 'none',
                }}
                style={{
                    padding: 0,
                    margin: 0,
                }}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {/* <TouchableOpacity
                        onPress={handleDismiss}
                        style={styles.closeButton}
                    >
                    </TouchableOpacity> */}
                    <RecordScreen
                        closeMenu={handleDismiss}
                    />

                </BottomSheetView>
            </BottomSheetModal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#000',
        padding: 0,
        margin: 0
    },
    closeButton: {
        backgroundColor: '#7D7D7D'
    }
});