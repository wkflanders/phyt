import { View, Text } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { Feed } from '@/features/social/components/Feed';

const Home = () => {
    return (
        <SafeAreaView className="h-full w-full bg-black">
            <Header />
            <Feed />
        </SafeAreaView>
    );
};

export default Home;