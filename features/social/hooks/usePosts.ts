import { useState } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';

interface Post {
    id: string;
    user_id: string;
    content: string;
    run_id?: string;
    visibility: 'public' | 'private' | 'followers';
    created_at: string;
    updated_at: string;
}

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

interface Reaction {
    id: string;
    post_id: string;
    user_id: string;
    type: 'like' | 'love' | 'celebrate';
    created_at: string;
}

interface CreatePostParams {
    content: string;
    runId?: string;
    visibility?: 'public' | 'private' | 'followers';
}

export const usePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = usePrivy();

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
          user:users!posts_user_id_fkey(username, display_name, avatar_url),
          run:runs(*)
        `)
                .single();

            if (postError) throw postError;
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

            const { data, error: commentError } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    content,
                    user_id: user.id
                })
                .select(`
          *,
          user:users!comments_user_id_fkey(username, display_name, avatar_url)
        `)
                .single();

            if (commentError) throw commentError;
            return data;
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

    const getPostWithDetails = async (postId: string) => {
        try {
            setLoading(true);
            setError(null);

            const [postResult, commentsResult, reactionsResult] = await Promise.all([
                // Get post with user and run details
                supabase
                    .from('posts')
                    .select(`
            *,
            user:users!posts_user_id_fkey(username, display_name, avatar_url),
            run:runs(*)
          `)
                    .eq('id', postId)
                    .single(),

                // Get comments with user details
                supabase
                    .from('comments')
                    .select(`
            *,
            user:users!comments_user_id_fkey(username, display_name, avatar_url)
          `)
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true }),

                // Get reactions with user details
                supabase
                    .from('reactions')
                    .select(`
            *,
            user:users!reactions_user_id_fkey(username, display_name, avatar_url)
          `)
                    .eq('post_id', postId)
            ]);

            if (postResult.error) throw postResult.error;
            if (commentsResult.error) throw commentsResult.error;
            if (reactionsResult.error) throw reactionsResult.error;

            return {
                post: postResult.data,
                comments: commentsResult.data,
                reactions: reactionsResult.data
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load post';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    const getFeed = async (limit = 20, startAfter?: string, userId?: string) => {
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
                    user:users!posts_user_id_fkey(username, display_name, avatar_url),
                    run:runs(*),
                    comments(count),
                    reactions(count)
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            // If userId is provided, only get that user's posts
            if (userId) {
                query = query.eq('user_id', userId);
            } else {
                // Otherwise get public posts and user's own posts
                query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
            }

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