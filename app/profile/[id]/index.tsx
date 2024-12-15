import { useEffect } from 'react';
import { View, RefreshControl, Pressable, Text } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { ScrollView } from 'react-native-gesture-handler';
import { UserSearch } from '@/features/profile/components/UserSearch';
import { MonthlyActivityChart } from '@/features/profile/components/MonthlyActivityChart';

export default function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string; }>();
    const {
        profile,
        isOwnProfile,
        followStats,
        loading,
        refreshProfile,
        toggleFollow,
        isFollowing
    } = useProfile(id);

    // Handle deep linking with correct path format
    useEffect(() => {
        if (!id) {
            // Using the root-level tabs path
            router.replace('/');
        }
    }, [id]);

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    title: profile?.username || 'Profile',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()}>
                            <Text style={{ color: 'white', marginLeft: 10 }}>Back</Text>
                        </Pressable>
                    ),
                }}
            />
            <UserSearch />
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={refreshProfile}
                        tintColor="#00F6FB"
                    />
                }
            >
                <ProfileHeader
                    profile={profile}
                    followStats={followStats}
                    isOwnProfile={isOwnProfile}
                    isFollowing={isFollowing}
                    onFollowPress={toggleFollow}
                    onFollowersPress={() => router.push(`/profile/${id}/followers`)}
                    onFollowingPress={() => router.push(`/profile/${id}/following`)}
                    onEditPress={() => router.push(`/profile/edit`)}
                />

                <MonthlyActivityChart
                    userId={id}
                />
            </ScrollView>
        </View>
    );
}