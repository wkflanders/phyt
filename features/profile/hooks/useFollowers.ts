import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Follower {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

// Updated to match Supabase response structure
interface FollowRecord {
    follower: Follower[];  // Changed from Follower to Follower[]
}

export function useFollowers(userId: string) {
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(false);

    const loadFollowers = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('follows')
                .select(`
                    follower:follower_id (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .eq('following_id', userId);

            if (error) throw error;

            // First cast to unknown, then to our type to handle the type conversion safely
            const typedData = (data as unknown) as FollowRecord[];

            // Flatten the array of follower arrays into a single array of followers
            const flattenedFollowers = typedData.flatMap(item => item.follower);
            setFollowers(flattenedFollowers);
        } catch (error) {
            console.error('Error loading followers:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadFollowers();
    }, [loadFollowers]);

    return {
        followers,
        loading,
        refreshFollowers: loadFollowers,
    };
}