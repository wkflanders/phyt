import { View, FlatList } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { UserListItem } from '@/features/profile/components/UserListItem';
import { useFollowers } from '@/features/profile/hooks/useFollowers';

export default function FollowersScreen() {
    const { id } = useLocalSearchParams<{ id: string; }>();
    const { followers, loading, refreshFollowers } = useFollowers(id);

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    title: 'Followers',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                }}
            />

            <FlatList
                data={followers}
                renderItem={({ item }) => <UserListItem user={item} />}
                keyExtractor={(item) => item.privy_id}
                refreshing={loading}
                onRefresh={refreshFollowers}
            />
        </View>
    );
}