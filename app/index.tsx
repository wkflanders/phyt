import { View, Text, ScrollView, Image } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';

import { magic } from "@/lib/magic";

import { images } from "@/constants";
import { useGlobalContext } from '@/context/GlobalProvider';


export default function App() {
    const { isLoading, isLoggedIn } = useGlobalContext();

    if (!isLoading && isLoggedIn) return <Redirect href="/home" />;

    return (
        <SafeAreaView className="bg-black">
            <SafeAreaProvider>
                <magic.Relayer />
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
                        <Button
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
            </SafeAreaProvider>
        </SafeAreaView>
    );
};