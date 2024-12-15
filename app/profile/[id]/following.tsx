import { View, FlatList } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { UserListItem } from '@/features/profile/components/UserListItem';
import { useFollowing } from '@/features/profile/hooks/useFollowing';

export default function FollowingScreen() {
    const { id } = useLocalSearchParams<{ id: string; }>();
    const { following, loading, refreshFollowing } = useFollowing(id);

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    title: 'Following',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                }}
            />

            <FlatList
                data={following}
                renderItem={({ item }) => <UserListItem user={item} />}
                keyExtractor={(item) => item.privy_id}
                refreshing={loading}
                onRefresh={refreshFollowing}
            />
        </View>
    );
}