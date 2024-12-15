import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useEditProfile } from '@/features/profile/hooks/useEditProfile';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function EditProfileScreen() {
    const {
        formData,
        uploading,
        saving,
        error,
        handleUpdateAvatar,
        handleFieldChange,
        handleSave,
    } = useEditProfile();

    const handleImagePick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            await handleUpdateAvatar(result.assets[0].uri);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    headerTitle: 'Edit Profile',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving || uploading}
                            className="mr-4"
                        >
                            {saving ? (
                                <ActivityIndicator color="#00F6FB" />
                            ) : (
                                <Text className="text-[#00F6FB] font-semibold text-lg">Save</Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />

            <View className="p-4">
                <TouchableOpacity
                    onPress={handleImagePick}
                    disabled={uploading}
                    className="items-center mb-6"
                >
                    <Image
                        source={formData.avatar_url || "/api/placeholder/100/100"}
                        className="w-24 h-24 rounded-full"
                    />
                    {uploading ? (
                        <ActivityIndicator color="#00F6FB" className="mt-2" />
                    ) : (
                        <Text className="text-[#00F6FB] mt-2">Change Photo</Text>
                    )}
                </TouchableOpacity>

                {error && (
                    <Text className="text-red-500 mb-4 text-center">{error}</Text>
                )}

                <View className="space-y-4">
                    <View>
                        <Text className="text-gray-400 mb-1 text-sm">Display Name</Text>
                        <TextInput
                            value={formData.display_name}
                            onChangeText={(text) => handleFieldChange('display_name', text)}
                            placeholder="Display Name"
                            placeholderTextColor="#666"
                            className="bg-gray-900 p-4 rounded-lg text-white"
                        />
                    </View>

                    <View>
                        <Text className="text-gray-400 mb-1 text-sm">Username</Text>
                        <TextInput
                            value={formData.username}
                            onChangeText={(text) => handleFieldChange('username', text)}
                            placeholder="Username"
                            placeholderTextColor="#666"
                            className="bg-gray-900 p-4 rounded-lg text-white"
                            autoCapitalize="none"
                        />
                    </View>

                    <View>
                        <Text className="text-gray-400 mb-1 text-sm">Bio</Text>
                        <TextInput
                            value={formData.bio}
                            onChangeText={(text) => handleFieldChange('bio', text)}
                            placeholder="Write a bio..."
                            placeholderTextColor="#666"
                            multiline
                            numberOfLines={4}
                            className="bg-gray-900 p-4 rounded-lg text-white"
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}