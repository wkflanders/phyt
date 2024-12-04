import { View, Text } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';

const Home = () => {
    return (
        <SafeAreaView className="h-full w-full bg-black">
            <Header />
            <Text className="color-white">
                Hello
            </Text>
        </SafeAreaView>
    );
};

export default Home;