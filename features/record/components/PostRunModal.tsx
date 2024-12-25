import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity, Switch, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { usePost } from '@/features/social/hooks/usePosts';
import { RunMap } from '@/features/runs/components/RunMap';
import { Icon } from '@/components/Icon';
import icons from '@/constants/icons';
import type { Run } from '@/types/types';

interface PostRunModalProps {
    visible: boolean;
    onClose: () => void;
    run: Run;
}

export function PostRunModal({ visible, onClose, run }: PostRunModalProps) {
    const [content, setContent] = useState('');
    const [includeMap, setIncludeMap] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const { createPost } = usePost();

    const handlePost = async () => {
        try {
            setIsPosting(true);
            await createPost({
                content,
                runId: run.id,
                visibility: 'public',
                includeMap
            });
            onClose();
        } catch (error) {
            console.error('Error posting run:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const formatStats = () => {
        const miles = run.distance_meters ? (run.distance_meters / 1609.34).toFixed(2) : '0.00';
        const hours = run.duration_seconds ? Math.floor(run.duration_seconds / 3600) : 0;
        const minutes = run.duration_seconds ? Math.floor((run.duration_seconds % 3600) / 60) : 0;
        const seconds = run.duration_seconds ? run.duration_seconds % 60 : 0;
        const pace = run.distance_meters && run.duration_seconds
            ? ((run.duration_seconds / 60) / (run.distance_meters / 1609.34)).toFixed(2)
            : '0.00';

        return {
            distance: `${miles} mi`,
            duration: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            pace: `${pace} /mi`
        };
    };

    const stats = formatStats();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

                <View className="flex-1 pt-20 bg-black/95">
                    <View className="flex-1 p-4">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white text-xl font-bold">Share Your Run</Text>
                            <Icon
                                icon={icons.close}
                                size={24}
                                color="#ffffff"
                                onPress={onClose}
                            />
                        </View>

                        <View className="bg-gray-900 rounded-lg p-4 mb-6">
                            <View className="flex-row justify-between mb-4">
                                <View>
                                    <Text className="text-gray-400 text-sm">Distance</Text>
                                    <Text className="text-white text-lg font-bold">{stats.distance}</Text>
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-sm">Duration</Text>
                                    <Text className="text-white text-lg font-bold">{stats.duration}</Text>
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-sm">Pace</Text>
                                    <Text className="text-white text-lg font-bold">{stats.pace}</Text>
                                </View>
                            </View>
                        </View>

                        <TextInput
                            className="bg-gray-900 rounded-lg p-4 text-white mb-6"
                            placeholder="How was your run?"
                            placeholderTextColor="#666"
                            multiline
                            numberOfLines={4}
                            value={content}
                            onChangeText={setContent}
                            style={{ textAlignVertical: 'top' }}
                        />

                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-white">Include Run Map</Text>
                            <Switch
                                value={includeMap}
                                onValueChange={setIncludeMap}
                                trackColor={{ false: '#666', true: '#00F6FB' }}
                            />
                        </View>

                        {includeMap && (
                            <View className="h-48 rounded-lg overflow-hidden mb-6">
                                <RunMap runId={run.id} height={192} />
                            </View>
                        )}

                        <TouchableOpacity
                            className="bg-phyt_red rounded-lg p-4"
                            onPress={handlePost}
                            disabled={isPosting}
                        >
                            <Text className="text-white text-center font-bold text-lg">
                                {isPosting ? 'Posting...' : 'Post Run'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}