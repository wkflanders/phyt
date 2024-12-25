import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';

interface User {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user: User;
}

interface Reaction {
    id: string;
    type: 'like' | 'love' | 'celebrate';
    user: User;
}

interface Post {
    id: string;
    content: string;
    created_at: string;
    user: User;
    run?: any; // Type this properly based on your run interface
    comments: Comment[];
    reactions: {
        count: number;
        items: Reaction[];
    };
}

interface CreatePostParams {
    content: string;
    runId?: string;
    visibility?: 'public' | 'private' | 'followers';
}

const postCache = new Map<string, CacheItem<any>>();
const CACHE_DURATION = 5 * 60 * 1000;
const profileCache = new Map<string, CacheItem<any>>();

export const usePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = usePrivy();

    const getCachedData = (key: string) => {
        const cached = profileCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        return null;
    };

    const setCachedData = (key: string, data: any) => {
        profileCache.set(key, {
            data,
            timestamp: Date.now()
        });
    };

    const invalidateCache = (postId?: string) => {
        if (postId) {
            postCache.delete(`post-${postId}`);
        } else {
            postCache.clear();
        }
    };

    const getPostWithDetails = useCallback(async (postId: string) => {
        try {
            setLoading(true);
            setError(null);

            const cacheKey = `post-${postId}`;
            const cachedData = getCachedData(cacheKey);

        }
    }, []);

    const createPost = async ({ content, runId, visibility = 'public' }: CreatePostParams) => {
        if (!user?.id) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: postError } = await supabase
                .from('posts')
                .insert({
                    content,
                    run_id: runId,
                    visibility,
                    user_id: user.id
                })
                .select(`
                    *,
                    user:users!posts_user_id_fkey (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    run:runs(*),
                    comments:comments(count),
                    reactions:reactions(count)
                `)
                .single();

            if (postError) throw postError;

            // Emit post created event
            runEvents.emit(RUN_EVENTS.POST_CREATED, { post: data });
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create post';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const addComment = async (postId: string, content: string) => {
        if (!user?.id) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            // First create the comment
            const { data: newComment, error: commentError } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    content,
                    user_id: user.id
                })
                .select(`
                    *,
                    user:users!comments_user_id_fkey (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .single();

            if (commentError) throw commentError;

            // Then get the updated post with all comments
            const { data: updatedPost, error: postError } = await supabase
                .from('posts')
                .select(`
                    *,
                    user:users!posts_user_id_fkey (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    run:runs(*),
                    comments(
                        *,
                        user:users!comments_user_id_fkey (
                            privy_id,
                            username,
                            display_name,
                            avatar_url
                        )
                    ),
                    reactions(count)
                `)
                .eq('id', postId)
                .single();

            if (postError) throw postError;

            // Emit comment created event with full post data
            runEvents.emit(RUN_EVENTS.COMMENT_CREATED, {
                postId,
                comment: newComment,
                updatedPost
            });

            return newComment;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add comment';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const toggleReaction = async (postId: string, type: Reaction['type']) => {
        if (!user?.id) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            // Check if reaction exists
            const { data: existingReaction } = await supabase
                .from('reactions')
                .select()
                .eq('post_id', postId)
                .eq('user_id', user.id)
                .single();

            if (existingReaction) {
                // Remove reaction if it exists
                const { error: deleteError } = await supabase
                    .from('reactions')
                    .delete()
                    .eq('id', existingReaction.id);

                if (deleteError) throw deleteError;
                return null;
            } else {
                // Add new reaction
                const { data, error: insertError } = await supabase
                    .from('reactions')
                    .insert({
                        post_id: postId,
                        type,
                        user_id: user.id
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                return data;
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to toggle reaction';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const getFeed = async (limit = 20, startAfter?: string) => {
        if (!user?.id) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    user:users!posts_user_id_fkey (
                        privy_id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    run:runs(*),
                    comments:comments(count),
                    reactions:reactions(count)
                `)
                .or(`visibility.eq.public,user_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (startAfter) {
                query = query.lt('created_at', startAfter);
            }

            const { data, error: feedError } = await query;

            if (feedError) throw feedError;
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load feed';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (postId: string) => {
        if (!user?.id) {
            throw new Error('User not authenticated');
        }

        try {
            setLoading(true);
            setError(null);

            const { error: deleteError } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete post';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    return {
        createPost,
        addComment,
        toggleReaction,
        getPostWithDetails,
        getFeed,
        deletePost,
        loading,
        error
    };
};