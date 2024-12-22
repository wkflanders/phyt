import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Header from '@/components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TabButtonProps {
    title: string;
    isActive: boolean;
    onPress: () => void;
}

type TabType = 'runners' | 'lineup' | 'leaderboard';

const TabButton: React.FC<TabButtonProps> = ({ title, isActive, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        className={`px-4 py-3 rounded-t-lg ${isActive ? 'bg-phyt_red' : 'bg-phyt_bg'}`}
    >
        <Text className={`text-lg font-intersemibold ${isActive ? 'text-white' : 'text-phyt_text_secondary'}`}>
            {title}
        </Text>
    </TouchableOpacity>
);

const RunnersScreen: React.FC = () => (
    <View className="flex-1 p-4">
        <Text className="text-white">Runners Content</Text>
    </View>
);

const LineupScreen: React.FC = () => (
    <View className="flex-1 p-4">
        <Text className="text-white">Lineup Content</Text>
    </View>
);

const LeaderboardScreen: React.FC = () => (
    <View className="flex-1 p-4">
        <Text className="text-white">Leaderboard Content</Text>
    </View>
);

const Play: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('runners');

    const renderContent = () => {
        switch (activeTab) {
            case 'runners':
                return <RunnersScreen />;
            case 'lineup':
                return <LineupScreen />;
            case 'leaderboard':
                return <LeaderboardScreen />;
            default:
                return <RunnersScreen />;
        }
    };

    return (
        <SafeAreaView className="h-full w-full bg-black">
            <Header />
            <View className="flex-1">
                {/* Tab Navigation */}
                <View className="flex-row justify-around border-b border-phyt_border">
                    <TabButton
                        title="Runners"
                        isActive={activeTab === 'runners'}
                        onPress={() => setActiveTab('runners')}
                    />
                    <TabButton
                        title="Lineup"
                        isActive={activeTab === 'lineup'}
                        onPress={() => setActiveTab('lineup')}
                    />
                    <TabButton
                        title="Leaderboard"
                        isActive={activeTab === 'leaderboard'}
                        onPress={() => setActiveTab('leaderboard')}
                    />
                </View>

                {/* Content Area */}
                <View className="flex-1">
                    {renderContent()}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Play;