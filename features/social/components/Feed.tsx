import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { Post } from './Post';
import { usePost } from '../hooks/usePosts';
import { runEvents, RUN_EVENTS } from '@/lib/runEvents';
import { FeedPost, PostMetadata, FeedPostWithMetadata } from '@/types/types';

interface FeedProps {
    userId?: string;
}

export function Feed({ userId }: FeedProps) {
    const { getFeed, loading, error } = usePost();
    const [posts, setPosts] = useState<FeedPostWithMetadata[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadFeed = async (refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            }

            const lastPost = !refresh && posts.length > 0 ? posts[posts.length - 1] : undefined;
            const newPosts = await getFeed(20, lastPost?.created_at);

            if (newPosts.length < 20) {
                setHasMore(false);
            }

            setPosts(refresh ? newPosts : [...posts, ...newPosts]);
        } catch (err) {
            console.error('Error loading feed:', err);
        } finally {
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadFeed(true);
    }, [userId]);

    useEffect(() => {
        const handleNewPost = ({ post, metadata }: { post: FeedPost, metadata: PostMetadata; }) => {
            setPosts(currentPosts => [{
                ...post,
                metadata
            }, ...currentPosts]);
        };

        const handleNewComment = ({ postId, comment, updatedPost }: {
            postId: string;
            comment: Comment;
            updatedPost: FeedPost;
        }) => {
            setPosts(currentPosts =>
                currentPosts.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post, // preserve existing post data including user
                            comments: updatedPost.comments,
                            reactions: updatedPost.reactions
                        };
                    }
                    return post;
                })
            );
        };

        runEvents.on(RUN_EVENTS.POST_CREATED, handleNewPost);
        runEvents.on(RUN_EVENTS.COMMENT_CREATED, handleNewComment);

        return () => {
            runEvents.off(RUN_EVENTS.POST_CREATED, handleNewPost);
            runEvents.off(RUN_EVENTS.COMMENT_CREATED, handleNewComment);
        };
    }, []);

    if (error) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-red-500">Error loading feed: {error}</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={posts}
            renderItem={({ item: post }) => (
                <Post
                    key={post.id}
                    post={post}
                    onPress={() => router.push(`/post/${post.id}`)}
                    includeMap={post.metadata?.includeMap}
                />
            )}
            keyExtractor={(post) => post.id}
            contentContainerClassName="p-4"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => loadFeed(true)}
                    tintColor="#00F6FB"
                />
            }
            onEndReached={() => {
                if (!loadingMore && hasMore) {
                    setLoadingMore(true);
                    loadFeed();
                }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
                loadingMore ? (
                    <View className="py-4">
                        <ActivityIndicator color="#00F6FB" />
                    </View>
                ) : null
            }
            ListEmptyComponent={
                !loading ? (
                    <View className="py-8">
                        <Text className="text-gray-400 text-center">No posts yet</Text>
                    </View>
                ) : null
            }
        />
    );
}