import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';

interface Profile {
    privy_id: string;
    [key: string]: any;
}

interface FollowStats {
    followers: number;
    following: number;
}

export function useProfile(profileId: string) {
    const { user } = usePrivy();

    // Memoize state to reduce unnecessary re-renders
    const [profile, setProfile] = useState<Profile | null>(null);
    const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Memoized loadProfile to prevent unnecessary recreations
    const loadProfile = useCallback(async () => {
        if (!profileId) return;

        try {
            setLoading(true);

            // Parallel data fetching with improved error handling
            const [
                profileData,
                followersCount,
                followingCount,
                followingStatus
            ] = await Promise.all([
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

            // Only update state if data has changed
            setProfile(prev =>
                JSON.stringify(prev) !== JSON.stringify(profileData) ? profileData : prev
            );

            setFollowStats(prev => {
                const newStats = {
                    followers: followersCount,
                    following: followingCount
                };
                return JSON.stringify(prev) !== JSON.stringify(newStats) ? newStats : prev;
            });

            setIsFollowing(prev => prev !== followingStatus ? followingStatus : prev);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }, [profileId, user]);

    const toggleFollow = useCallback(async () => {
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

            setIsFollowing(prev => !prev);
            setFollowStats(prev => ({
                ...prev,
                followers: prev.followers + (isFollowing ? -1 : 1)
            }));
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    }, [user, profileId, isFollowing]);

    // Memoize derived values
    const isOwnProfile = useMemo(() => user?.id === profileId, [user, profileId]);

    // Controlled effect with dependency array
    useEffect(() => {
        // Only load if not already loaded and profileId exists
        if (profileId && !profile) {
            loadProfile();
        }
    }, [profileId, loadProfile, profile]);

    // Expose memoized refresh function
    const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

    return {
        profile,
        followStats,
        isFollowing,
        loading,
        isOwnProfile,
        refreshProfile,
        toggleFollow
    };
}