
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrivyProvider } from '@privy-io/expo';

import { PortalHost } from '@rn-primitives/portal';

import "../global.css";


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
        "Inter-ExtraLight": require("../assets/fonts/Inter-ExtraLight.ttf"),
        "Inter-Light": require("../assets/fonts/Inter-Light.ttf"),
        "Inter-Thin": require("../assets/fonts/Inter-Thin.ttf"),
        "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
        "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
        "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
        "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
        "Inter-ExtraBold": require("../assets/fonts/Inter-ExtraBold.ttf"),
        "Inter-Black": require("../assets/fonts/Inter-Black.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded) SplashScreen.hideAsync().catch(console.error);

    }, [fontsLoaded, error]);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'black' }}>
                <Text>
                    FAIL
                </Text>
            </View>
        );
    }

    return (
        <>
            <SafeAreaProvider>
                <PrivyProvider
                    appId={'cm466mv4o01wfkhkse3g9gyhr'}
                    clientId={'client-WY5eJqKxgS2bURn6XZU2CTYFMphvJ8X9he8fipPukPvKH'}
                >
                    <Stack>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    </Stack>
                </PrivyProvider>
            </SafeAreaProvider>
            <PortalHost />
        </>
    );
};

export default RootLayout;