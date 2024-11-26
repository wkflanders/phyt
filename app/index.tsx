import { View, Text, ScrollView, Image } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { images } from "@/constants";

export default function App() {
    return (
        <SafeAreaView className="bg-phyt_blue">
            <ScrollView contentContainerStyle={{ height: '100%' }}>
                <View className="w-full justify-center items-center min-h-[85vh] px-4">
                    <Text className="color-phyt_red font-incsemibold text-2xl pb-2">
                        welcome to
                    </Text>
                    <Image
                        source={images.onboard_logo}
                        className='w-[200px] h-[84px]'
                        resizeMode="contain"
                    />
                    <Link href='/sign-in'>signin</Link>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};