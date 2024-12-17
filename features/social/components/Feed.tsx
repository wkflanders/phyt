// @/features/social/components/Feed.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { Post, type FeedPost } from './Post';
import { usePost } from '../hooks/usePosts';

interface FeedProps {
    userId?: string;
}

export function Feed({ userId }: FeedProps) {
    const { getFeed, loading, error } = usePost();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadFeed = async (refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            }

            const lastPost = !refresh && posts.length > 0 ? posts[posts.length - 1] : undefined;
            const newPosts = await getFeed(20, lastPost?.created_at, userId);

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

    if (error) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-red-500">Error loading feed: {error}</Text>
            </View>
        );
    }
    const handlePostPress = (postId: string) => {
        // Using href instead of push for type safety
        router.navigate({
            pathname: "/post/[id]",
            params: { id: postId }
        });
    };

    return (
        <FlatList
            data={posts}
            renderItem={({ item: post }) => (
                <Post
                    post={post}
                    onPress={() => handlePostPress(post.id)}
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