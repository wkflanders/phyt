import { View, Text, ScrollView, Image } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaView className="bg-phyt_blue">
            <ScrollView contentContainerStyle={{ height: '100%' }}>
                <View className="w-full flex justify-center items-center h-full px-4">
                    <Image
                        src=''
                        className=''
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};