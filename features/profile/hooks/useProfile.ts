import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';
import { cache, getProfileCacheKey } from '@/lib/cache';

interface Profile {
    privy_id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
}

interface FollowStats {
    followers: number;
    following: number;
}

interface ProfileData {
    profile: Profile;
    followStats: FollowStats;
    isFollowing: boolean;
}

export function useProfile(profileId: string) {
    const { user } = usePrivy();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async (forceRefresh = false) => {
        if (!profileId) return;

        try {
            setLoading(true);
            setError(null);

            if (!forceRefresh) {
                const cachedData = await cache.get<ProfileData>('profile', profileId);
                if (cachedData) {
                    setProfile(cachedData.profile);
                    setFollowStats(cachedData.followStats);
                    setIsFollowing(cachedData.isFollowing);
                    return;
                }
            }

            const { data, error } = await supabase
                .rpc('get_profile_data', {
                    profile_id: profileId,
                    current_user_id: user?.id || null
                });

            if (error) throw error;

            const profileData: ProfileData = {
                profile: data.profile,
                followStats: {
                    followers: data.follow_stats.followers_count,
                    following: data.follow_stats.following_count
                },
                isFollowing: data.is_following
            };

            setProfile(profileData.profile);
            setFollowStats(profileData.followStats);
            setIsFollowing(profileData.isFollowing);

            await cache.set('profile', profileId, profileData);

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }, [profileId, user?.id]);

    const toggleFollow = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .rpc('toggle_follow', {
                    follower_id: user.id,
                    following_id: profileId
                });

            if (error) throw error;

            setIsFollowing(data.is_following);
            setFollowStats(prev => ({
                ...prev,
                followers: prev.followers + (data.is_following ? 1 : -1)
            }));

            // Invalidate profile cache
            await cache.invalidate('profile', profileId);
            // Also invalidate the current user's profile cache since their following count changed
            if (user.id !== profileId) {
                await cache.invalidate('profile', user.id);
            }

        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    }, [user, profileId]);

    const isOwnProfile = useMemo(() => user?.id === profileId, [user?.id, profileId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        followStats,
        isFollowing,
        loading,
        isOwnProfile,
        refreshProfile: () => loadProfile(true),
        toggleFollow
    };
}