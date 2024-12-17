import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { RunStats } from '@/features/runs/hooks/useRunData';

export const WeeklyStats = ({ stats }: { stats: RunStats | null; }) => {
    const formatDuration = useMemo(() => {
        return (durationSeconds: number): string => {
            const hours = Math.floor(durationSeconds / 3600);
            const minutes = Math.floor((durationSeconds % 3600) / 60);
            const seconds = durationSeconds % 60;  // Add this

            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            }
            return `${seconds}s`;
        };
    }, []);

    if (!stats) {
        return <Text className="text-white text-center my-4">No stats available.</Text>;
    }

    return (
        <View className="flex-row justify-between p-4 rounded-lg my-4">
            <View className="items-center flex-1">
                <Text className="text-lg font-bold text-white">
                    {stats.totalDistance.toFixed(1)} mi
                </Text>
                <Text className="text-sm text-white">Total Distance</Text>
            </View>
            <View className="items-center flex-1">
                <Text className="text-lg font-bold text-white">
                    {formatDuration(stats.totalDuration)}
                </Text>
                <Text className="text-sm text-white">Total Time</Text>
            </View>
            <View className="items-center flex-1">
                <Text className="text-lg font-bold text-white">
                    {stats.totalElevationGain.toFixed(0)}m
                </Text>
                <Text className="text-sm text-white">Elevation</Text>
            </View>
            <View className="items-center flex-1">
                <Text className="text-lg font-bold text-white">
                    {stats.totalRuns}
                </Text>
                <Text className="text-sm text-white">Total Runs</Text>
            </View>
        </View>
    );
};