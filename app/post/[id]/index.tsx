import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Post, type FeedPost } from '@/features/social/components/Post';
import { usePost } from '@/features/social/hooks/usePosts';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string; }>();
    const { getPostWithDetails } = usePost();
    const [post, setPost] = useState<FeedPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPost = async () => {
            try {
                setLoading(true);
                const postData = await getPostWithDetails(id);
                const formattedPost: FeedPost = {
                    ...postData.post,
                    comments: postData.comments || [],
                    reactions: {
                        count: postData.reactions?.length || 0,
                        items: postData.reactions || []
                    }
                };
                setPost(formattedPost);
            } catch (err) {
                console.error('Error loading post:', err);
                setError(err instanceof Error ? err.message : 'Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [id]);

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    title: 'Post',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()}>
                            <Text style={{ color: 'white', marginLeft: 10 }}>Back</Text>
                        </Pressable>
                    ),
                }}
            />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#00F6FB" />
                </View>
            ) : error ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-red-500">{error}</Text>
                </View>
            ) : post ? (
                <Post post={post} isDetail />
            ) : null}
        </View>
    );
}