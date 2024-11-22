import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';

import "../global.css";

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
    const [fontsLoaded, error] = useFonts({
        "Inconsolata-ExtraLight": require("../assets/fonts/Inconsolata-ExtraLight.ttf"),
        "Inconsolata-Light": require("../assets/fonts/Inconsolata-Light.ttf"),
        "Inconsolata-Regular": require("../assets/fonts/Inconsolata-Regular.ttf"),
        "Inconsolata-Medium": require("../assets/fonts/Inconsolata-Medium.ttf"),
        "Inconsolata-Bold": require("../assets/fonts/Inconsolata-Bold.ttf"),
        "Inconsolata-SemiBold": require("../assets/fonts/Inconsolata-SemiBold.ttf"),
        "Inconsolata-ExtraBold": require("../assets/fonts/Inconsolata-ExtraBold.ttf"),
        "Inconsolata-Black": require("../assets/fonts/Inconsolata-Black.ttf"),
    });

    useEffect(() => {
        if (error) throw error;
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded, error]);

    if (!fontsLoaded && !error) return null;

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
    );
};

export default RootLayout;