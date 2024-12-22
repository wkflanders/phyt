import { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { Menu } from '@/components/ui/Menu';

import { FormField } from '@/components/FormField';
import { FunctionalButton } from '@/components/FunctionalButton';

interface FormErrors {
    username?: string;
    displayName?: string;
    bio?: string;
    avatar?: string;
}

const DEFAULT_AVATAR_URL = 'https://ltmquqidkjjnkatjlejs.supabase.co/storage/v1/object/public/avatars/icon.png';
const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_DIMENSION = 500; // pixels

const Onboarding = () => {
    const { user } = usePrivy();
    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        bio: '',
        avatarUrl: DEFAULT_AVATAR_URL
    });
    const [avatarImage, setAvatarImage] = useState<string | null>(null);
    const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);

    const handleChange = (field: string) => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    const compressImage = async (uri: string): Promise<ImageManipulator.ImageResult> => {
        try {
            // First resize if needed
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Check file size and compress more if needed
            const response = await fetch(result.uri);
            const blob = await response.blob();
            const size = blob.size / (1024 * 1024); // Convert to MB

            if (size > MAX_IMAGE_SIZE_MB) {
                // Compress more aggressively
                return ImageManipulator.manipulateAsync(
                    result.uri,
                    [],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
                );
            }

            return result;
        } catch (error) {
            console.error('Error compressing image:', error);
            throw new Error('Failed to compress image');
        }
    };

    const deleteCurrentAvatar = async () => {
        if (!currentAvatarPath || !user) return;

        try {
            const { error } = await supabase.storage
                .from('avatars')
                .remove([currentAvatarPath]);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting avatar:', error);
            // Continue anyway as we want to reset the avatar
        }
    };

    const resetToDefaultAvatar = async () => {
        try {
            setIsUploadingAvatar(true);

            // Delete current avatar if it exists
            await deleteCurrentAvatar();

            // Reset states
            setAvatarImage(null);
            setCurrentAvatarPath(null);
            setFormData(prev => ({
                ...prev,
                avatarUrl: DEFAULT_AVATAR_URL
            }));

            Alert.alert('Success', 'Avatar reset to default');
        } catch (error) {
            console.error('Error resetting avatar:', error);
            Alert.alert('Error', 'Failed to reset avatar');
        } finally {
            setIsUploadingAvatar(false);
            setShowAvatarMenu(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                // Check file size
                const response = await fetch(result.assets[0].uri);
                const blob = await response.blob();
                const size = blob.size / (1024 * 1024); // Convert to MB

                if (size > MAX_IMAGE_SIZE_MB * 2) {
                    Alert.alert('Error', `Image is too large. Maximum size is ${MAX_IMAGE_SIZE_MB * 2}MB`);
                    return;
                }

                const compressed = await compressImage(result.assets[0].uri);
                setAvatarImage(compressed.uri);
                await uploadAvatar(compressed);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            setErrors(prev => ({ ...prev, avatar: 'Failed to pick image' }));
            Alert.alert('Error', 'Failed to pick image');
        }
        setShowAvatarMenu(false);
    };

    const uploadAvatar = async (imageResult: ImageManipulator.ImageResult) => {
        if (!user) return;

        setIsUploadingAvatar(true);
        try {
            // Convert manipulated image to base64
            const response = await fetch(imageResult.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    resolve(base64.split(',')[1]);
                };
            });
            reader.readAsDataURL(blob);
            const base64Data = await base64Promise;

            // Delete previous avatar if it exists
            await deleteCurrentAvatar();

            const fileName = `avatar-${user.id}-${Date.now()}`;
            const filePath = `${fileName}.jpg`;
            const contentType = 'image/jpeg';

            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64Data), {
                    contentType,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setCurrentAvatarPath(filePath);
            setFormData(prev => ({
                ...prev,
                avatarUrl: publicUrl
            }));

            if (errors.avatar) {
                setErrors(prev => ({
                    ...prev,
                    avatar: undefined
                }));
            }

            Alert.alert('Success', 'Avatar updated successfully');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            setErrors(prev => ({
                ...prev,
                avatar: 'Failed to upload image'
            }));
            // Reset to default avatar if upload fails
            setFormData(prev => ({
                ...prev,
                avatarUrl: DEFAULT_AVATAR_URL
            }));
            Alert.alert('Error', 'Failed to upload avatar');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }

        if (formData.bio && formData.bio.length > 160) {
            newErrors.bio = 'Bio must be less than 160 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!user) {
            setErrors({ username: 'No user found. Please try logging in again.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: existingUser } = await supabase
                .from('users')
                .select('username')
                .eq('username', formData.username.toLowerCase())
                .neq('privy_id', user.id)
                .single();

            if (existingUser) {
                setErrors({ username: 'Username is already taken' });
                return;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    username: formData.username.toLowerCase(),
                    display_name: formData.displayName,
                    bio: formData.bio,
                    avatar_url: formData.avatarUrl,
                })
                .eq('privy_id', user.id);

            if (updateError) throw updateError;

            const { error: poolError } = await supabase
                .from('user_nft_pool')
                .insert({
                    display_name: formData.displayName,
                    avatar_url: formData.avatarUrl
                });

            if (poolError) {
                console.error('Error adding to NFT pool:', poolError);
            }

            router.push('/home');
        } catch (err) {
            console.error('Error updating profile:', err);
            setErrors({ username: 'Failed to update profile. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="bg-black h-full">
            <ScrollView>
                <View className="justify-center min-h-[70vh] px-4">
                    <View className="w-full justify-center items-center mb-8">
                        <Text className="font-intersemibold color-white text-3xl">
                            Complete Your Profile
                        </Text>
                        <Text className="font-intersemibold text-xl color-phyt_text_secondary text-center mt-4">
                            Let's set up your profile so others can find you
                        </Text>
                    </View>

                    <View className="items-center mb-6">
                        <TouchableOpacity
                            onPress={() => setShowAvatarMenu(true)}
                            className="w-24 h-24 rounded-full bg-phyt_form justify-center items-center overflow-hidden"
                        >
                            <Image
                                source={{ uri: avatarImage || formData.avatarUrl }}
                                className="w-full h-full"
                            />
                            {isUploadingAvatar && (
                                <View className="absolute w-full h-full bg-black/50 justify-center items-center">
                                    <Text className="text-white">Uploading...</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text className="text-phyt_text_secondary text-sm mt-2">
                            Tap to change avatar
                        </Text>
                        {errors.avatar && (
                            <Text className="text-red-500 text-sm mt-1">
                                {errors.avatar}
                            </Text>
                        )}

                        <Menu
                            open={showAvatarMenu}
                            onOpenChange={setShowAvatarMenu}
                            items={[
                                {
                                    label: 'Choose New Photo',
                                    onPress: pickImage
                                },
                                {
                                    label: 'Reset to Default',
                                    onPress: resetToDefaultAvatar,
                                    disabled: formData.avatarUrl === DEFAULT_AVATAR_URL
                                }
                            ]}
                        />
                    </View>

                    <View className="space-y-6">
                        <FormField
                            title="Username"
                            value={formData.username}
                            handleChangeText={handleChange('username')}
                            placeholder="USERNAME"
                            error={errors.username}
                            otherStyles="mb-4"
                        />

                        <FormField
                            title="Display Name"
                            value={formData.displayName}
                            handleChangeText={handleChange('displayName')}
                            placeholder="DISPLAY NAME"
                            error={errors.displayName}
                            otherStyles="mb-4"
                        />

                        <FormField
                            title="Bio"
                            value={formData.bio}
                            handleChangeText={handleChange('bio')}
                            placeholder="TELL US ABOUT YOURSELF"
                            error={errors.bio}
                            otherStyles="mb-4"
                        />

                        <FunctionalButton
                            title="Complete Profile"
                            handlePress={handleSubmit}
                            containerStyles="mt-6 w-full py-6 rounded-xl"
                            textStyles="font-intersemibold"
                            isLoading={isSubmitting}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Onboarding;