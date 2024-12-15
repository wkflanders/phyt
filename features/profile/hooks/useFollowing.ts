import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Following {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

interface FollowRecord {
    following: Following[];
}

export function useFollowing(userId: string) {
    const [following, setFollowing] = useState<Following[]>([]);
    const [loading, setLoading] = useState(false);

    const loadFollowing = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('follows')
                .select(`
                    following:following_id (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .eq('follower_id', userId);

            if (error) throw error;

            const typedData = (data as unknown) as FollowRecord[];
            const flattenedFollowing = typedData.flatMap(item => item.following);
            setFollowing(flattenedFollowing);
        } catch (error) {
            console.error('Error loading following:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadFollowing();
    }, [loadFollowing]);

    return {
        following,
        loading,
        refreshFollowing: loadFollowing,
    };
}