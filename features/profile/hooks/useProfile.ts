import { useState, useCallback, useEffect } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';

interface Profile {
    privy_id: string;
    // Add other profile fields here
    [key: string]: any;
}

interface FollowStats {
    followers: number;
    following: number;
}

export function useProfile(profileId: string) {
    const { user } = usePrivy();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        if (!profileId) return;
        console.log('Loading profile for ID:', profileId);

        try {
            setLoading(true);
            const [profileData, followersCount, followingCount, followingStatus] = await Promise.all([
                supabase
                    .from('users')
                    .select('*')
                    .eq('privy_id', profileId)
                    .single()
                    .then(({ data }) => data as Profile | null),
                supabase
                    .from('follows')
                    .select('*', { count: 'exact' })
                    .eq('following_id', profileId)
                    .then(({ count }) => count ?? 0),
                supabase
                    .from('follows')
                    .select('*', { count: 'exact' })
                    .eq('follower_id', profileId)
                    .then(({ count }) => count ?? 0),
                user ? supabase
                    .from('follows')
                    .select('*')
                    .eq('follower_id', user.id)
                    .eq('following_id', profileId)
                    .then(({ data }) => Boolean(data && data.length > 0))
                    : Promise.resolve(false)
            ]);

            setProfile(profileData);
            setFollowStats({
                followers: followersCount,
                following: followingCount
            });
            setIsFollowing(followingStatus);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }, [profileId, user]);

    const toggleFollow = async () => {
        if (!user) return;

        try {
            if (isFollowing) {
                await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', profileId);
            } else {
                await supabase
                    .from('follows')
                    .insert({
                        follower_id: user.id,
                        following_id: profileId
                    });
            }

            setIsFollowing(!isFollowing);
            setFollowStats(prev => ({
                ...prev,
                followers: prev.followers + (isFollowing ? -1 : 1)
            }));
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        followStats,
        isFollowing,
        loading,
        isOwnProfile: user?.id === profileId,
        refreshProfile,
        toggleFollow
    };
}