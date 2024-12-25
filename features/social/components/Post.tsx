import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, Pressable } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { usePost } from '@/features/social/hooks/usePosts';
import { RunMap } from '@/features/runs/components/RunMap';
import { Icon } from '@/components/Icon';
import icons from '@/constants/icons';
import { router } from 'expo-router';
import * as Share from 'expo-sharing';
import { User, Run, Comment, FeedPost } from '@/types/types';

interface PostProps {
    post: FeedPost;
    isDetail?: boolean;
    onPress?: () => void;
}

export const Post = ({ post, isDetail = false, onPress }: PostProps) => {
    const { addComment, toggleReaction } = usePost();
    const [showComments, setShowComments] = useState(isDetail);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reactionType, setReactionType] = useState<'like' | 'love' | 'celebrate' | null>(null);

    const runStats = post.run ? formatRunStats(post.run) : null;

    const handleProfilePress = () => {
        router.push(`/profile/${post.user.privy_id}`);
    };

    const handleReaction = async (type: 'like' | 'love' | 'celebrate') => {
        try {
            await toggleReaction(post.id, type);
            setReactionType(reactionType === type ? null : type);
        } catch (err) {
            console.error('Error toggling reaction:', err);
        }
    };

    const handleComment = async () => {
        if (!comment.trim()) return;

        try {
            setIsSubmitting(true);
            await addComment(post.id, comment.trim());
            setComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            const shareText = `Check out this run by ${post.user.display_name}!\n\n${post.content}${runStats ? `\n\nDistance: ${runStats.distance}\nTime: ${runStats.duration}\nPace: ${runStats.pace}` : ''
                }\n\nShared via RunTogether`;

            await Share.shareAsync(shareText);
        } catch (err) {
            console.error('Error sharing post:', err);
        }
    };

    const commentsCount = Array.isArray(post.comments)
        ? post.comments.length
        : post.comments.count;

    const commentsList = Array.isArray(post.comments)
        ? post.comments
        : [];

    const PostContent = (
        <View className="bg-black border border-gray-800 rounded-lg mb-4">
            {/* Header */}
            <TouchableOpacity
                className="flex-row items-center p-4"
                onPress={handleProfilePress}
            >
                <Image
                    source={{ uri: post.user.avatar_url || '/api/placeholder/40/40' }}
                    className="w-10 h-10 rounded-full"
                />
                <View className="ml-3 flex-1">
                    <Text className="text-white font-bold">{post.user.display_name}</Text>
                    <Text className="text-gray-400 text-sm">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Content */}
            <Pressable onPress={onPress}>
                <View className="px-4 mb-4">
                    <Text className="text-white text-base">{post.content}</Text>
                </View>

                {/* Run Stats */}
                {post.run && runStats && (
                    <View className="px-4 mb-4">
                        <View className="bg-gray-900 rounded-lg p-4">
                            <View className="flex-row justify-between mb-4">
                                <View>
                                    <Text className="text-gray-400 text-sm">Distance</Text>
                                    <Text className="text-white text-lg font-bold">{runStats.distance}</Text>
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-sm">Duration</Text>
                                    <Text className="text-white text-lg font-bold">{runStats.duration}</Text>
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-sm">Pace</Text>
                                    <Text className="text-white text-lg font-bold">{runStats.pace}</Text>
                                </View>
                            </View>

                            <View className="h-48 rounded-lg overflow-hidden">
                                <RunMap runId={post.run.id} height={192} />
                            </View>
                        </View>
                    </View>
                )}
            </Pressable>

            {/* Actions */}
            <View className="flex-row justify-between items-center px-4 py-3 border-t border-gray-800">
                <View className="flex-row gap-2">
                    <Icon
                        icon={icons.like}
                        size={24}
                        color={reactionType === 'like' ? '#FE205D' : '#ffffff'}
                        onPress={() => handleReaction('like')}
                    />
                    <Icon
                        icon={icons.heart}
                        size={24}
                        color={reactionType === 'love' ? '#FE205D' : '#ffffff'}
                        onPress={() => handleReaction('love')}
                    />
                    <Icon
                        icon={icons.celebrate}
                        size={24}
                        color={reactionType === 'celebrate' ? '#FFD700' : '#ffffff'}
                        onPress={() => handleReaction('celebrate')}
                    />
                </View>

                <View className="flex-row items-center">
                    <Icon
                        icon={icons.comment}
                        size={24}
                        color="#00F6FB"
                        onPress={() => isDetail ? null : setShowComments(!showComments)}
                    />
                    <Text className="text-white ml-2">{commentsCount}</Text>
                </View>

                <Icon
                    icon={icons.share}
                    size={24}
                    color="#ffffff"
                    onPress={handleShare}
                />
            </View>

            {/* Comments Section */}
            {showComments && (
                <View className="px-4 py-3 border-t border-gray-800">
                    <View className="flex-row items-center mb-4">
                        <TextInput
                            className="flex-1 bg-gray-900 rounded-full px-4 py-2 text-white mr-2"
                            placeholder="Add a comment..."
                            placeholderTextColor="#666"
                            value={comment}
                            onChangeText={setComment}
                        />
                        <Icon
                            icon={icons.send}
                            size={24}
                            color={comment.trim() ? '#00F6FB' : '#666'}
                            onPress={handleComment}
                        />
                    </View>

                    {commentsList.map((comment) => (
                        <View key={comment.id} className="mb-4">
                            <TouchableOpacity
                                className="flex-row items-center mb-2"
                                onPress={() => router.push(`/profile/${comment.user.privy_id}`)}
                            >
                                <Image
                                    source={{ uri: comment.user.avatar_url || '/api/placeholder/32/32' }}
                                    className="w-8 h-8 rounded-full"
                                />
                                <View className="ml-2">
                                    <Text className="text-white font-bold">{comment.user.display_name}</Text>
                                    <Text className="text-gray-400 text-xs">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <Text className="text-white ml-10">{comment.content}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    return isDetail ? (
        <ScrollView className="flex-1">{PostContent}</ScrollView>
    ) : (
        PostContent
    );
};

const formatRunStats = (run: Run) => {
    // Default to 0 if undefined and handle division by zero
    const distanceMeters = run.distance_meters || 0;
    const durationSeconds = run.duration_seconds || 0;

    const miles = (distanceMeters / 1609.34).toFixed(2);
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    // Calculate pace, handling division by zero
    const pace = distanceMeters > 0
        ? ((durationSeconds / 60) / (distanceMeters / 1609.34)).toFixed(2)
        : '0.00';

    return {
        distance: `${miles} mi`,
        duration: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        pace: `${pace} /mi`
    };
};