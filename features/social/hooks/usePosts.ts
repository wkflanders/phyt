import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';
import { cache } from '@/lib/cache';
import { Reaction, FeedPost } from '@/types/types';

interface CreatePostParams {
    content: string;
    runId?: string;
    visibility?: 'public' | 'private' | 'followers';
}

export const usePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = usePrivy();

    const getPostWithDetails = useCallback(async (postId: string): Promise<FeedPost | null> => {
        if (!postId) throw new Error('Post Id is required');

        try {
            const cachedPost: FeedPost | null = await cache.get('post', postId);
            if (cachedPost) return cachedPost;

            const { data, error: postError } = await supabase
                .rpc('get_post_details', { p_post_id: postId });

            if (postError) throw postError;
            if (!data) throw new Error('Post not found');

            const formattedData: FeedPost = {
                id: data.post.id,
                content: data.post.content,
                created_at: data.post.created_at,
                run: data.post.run,
                user: data.post.user,
                comments: data.comments || [],
                reactions: {
                    count: data.reactions?.length || 0,
                    items: data.reactions || []
                }
            };

            await cache.set('post', postId, formattedData);

            return formattedData;
        } catch (err) {
            console.error('Error fetching post: ', err);
            throw err;
        }
    }, []);

    const getFeed = useCallback(async (limit = 20, startAfter?: string) => {
        if (!user?.id) throw new Error('User not authenticated');

        try {
            const cacheKey = `feed_${limit}_${startAfter || 'initial'}`;
            const cachedFeed = await cache.get('feed', cacheKey);
            if (cachedFeed) return cachedFeed;

            const { data, error: feedError } = await supabase
                .rpc('get_feed', {
                    p_user_id: user.id,
                    p_limit: limit,
                    p_start_after: startAfter
                });

            if (feedError) throw feedError;

            await cache.set('feed', cacheKey, data || []);

            return data || [];
        } catch (err) {
            console.error('Error fetching feed: ', err);
            throw err;
        }
    }, [user?.id]);

    const createPost = async ({ content, runId, visibility = 'public' }: CreatePostParams) => {
        if (!user?.id) throw new Error('User not authenticated');

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

            // Invalidate relevant caches
            await cache.invalidate('feed');
            if (runId) {
                await cache.invalidate('run', runId);
            }

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
        if (!user?.id) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            // First create the comment
            const { data: newComment, error: commentError } = await supabase
                .rpc('add_comment', {
                    p_post_id: postId,
                    p_user_id: user.id,
                    p_content: content
                });

            if (commentError) throw commentError;

            // Invalidate post cache
            await cache.invalidate('post', postId);
            // Also invalidate feed cache since comment counts changed
            await cache.invalidate('feed');

            const updatedPost = await getPostWithDetails(postId);

            // Emit comment created event
            runEvents.emit(RUN_EVENTS.COMMENT_CREATED, {
                postId,
                comment: newComment,
                updatedPost
            });

            return updatedPost;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add comment';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const toggleReaction = async (postId: string, type: Reaction['type']) => {
        if (!user?.id) throw new Error('User not authenticated');

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
            } else {
                // Add new reaction
                const { error: insertError } = await supabase
                    .from('reactions')
                    .insert({
                        post_id: postId,
                        type,
                        user_id: user.id
                    });

                if (insertError) throw insertError;
            }

            // Invalidate relevant caches
            await cache.invalidate('post', postId);
            await cache.invalidate('feed');

            return !existingReaction;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to toggle reaction';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (postId: string) => {
        if (!user?.id) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            const { error: deleteError } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // Invalidate relevant caches
            await cache.invalidate('post', postId);
            await cache.invalidate('feed');
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