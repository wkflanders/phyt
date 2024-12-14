import { View, Text, ScrollView, Image } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { usePrivy } from '@privy-io/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FunctionalButton } from '@/components/FunctionalButton';

import { images } from "@/constants";
import { useSupabaseUser } from '@/hooks/useSupabaseUser';

export default function App() {
    const { user, isReady } = usePrivy();
    const { supabaseUser, isLoading } = useSupabaseUser();

    if (isLoading || !isReady) {
        return (
            <SafeAreaView className="bg-black">
                <View className="flex-1 justify-center items-center">
                    <Text className="text-white">Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (user && supabaseUser) return <Redirect href="/home" />;
    return (
        <SafeAreaView className="bg-black">
            <ScrollView contentContainerStyle={{ height: '100%' }}>
                <View className="w-full justify-center items-center min-h-[60vh] px-6">
                    <View className="pl-10">
                        <Image
                            source={images.P_logo}
                            className='w-[125px] h-[250px]'
                            resizeMode="contain"
                        />
                    </View>
                    <Text className="font-intersemibold color-white text-4xl mt-4">
                        Invite your friends
                    </Text>
                    <Text className="font-intersemibold text-xl color-phyt_text_secondary text-center mt-4">
                        Earn rewards every time a friend signs up with your link.
                    </Text>
                </View>
                <View className="px-2 w-full items-center mt-20 ">
                    <FunctionalButton
                        title="Invite a friend"
                        handlePress={() => { }}
                        textStyles="font-intersemibold"
                        containerStyles="w-full py-6 rounded-xl"
                        isLoading={false}
                    />
                    <Link className="text-xl font-intersemibold mt-4 text-phyt_text_secondary" href="/sign-in">
                        Skip
                    </Link>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};