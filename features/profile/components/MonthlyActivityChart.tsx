import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRunData } from '@/features/runs/hooks/useRunData';

export function MonthlyActivityChart({ data }: { data: { month: string; distance: number[]; }[]; }) {
    const chartData = useMemo(() => {
        const labels = data.map((monthData) => monthData.month);
        const distances = data.flatMap((monthData) => monthData.distance);
        const isEmpty = distances.every((value) => value === 0);

        return {
            labels: labels,
            datasets: [{
                data: isEmpty ? [0] : distances,
                color: () => '#FE205D',
                strokeWidth: 2,
            }],
        };
    }, [data]);

    return (
        <View className="my-5 bg-black rounded-lg p-4">
            <LineChart
                data={chartData}
                width={Dimensions.get('window').width - 20}
                height={300}
                yAxisSuffix=" mi"
                chartConfig={{
                    backgroundColor: '#000',
                    backgroundGradientFrom: '#0A0A0A',
                    backgroundGradientTo: '#0A0A0A',
                    color: (opacity = 1) => `rgba(254, 32, 93, ${opacity})`,
                    labelColor: () => '#fff',
                    propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: '#FE205D',
                    },
                    propsForBackgroundLines: {
                        stroke: '#222',
                    },
                }}
                bezier
                fromZero
                style={{
                    marginLeft: -10,
                    borderRadius: 12,
                }}
            />
        </View>
    );
}
