import { useEffect } from 'react';
import { View, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { ScrollView } from 'react-native-gesture-handler';

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
                }}
            />

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
                    onFollowersPress={() => router.push(`/(modals)/profile/${id}/followers`)}
                    onFollowingPress={() => router.push(`/(modals)/profile/${id}/following`)}
                    onEditPress={() => router.push('/(modals)/profile/edit')}
                />
            </ScrollView>
        </View>
    );
}