// hooks/useEditProfile.ts
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/expo';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface Profile {
    username: string;
    display_name: string;
    bio: string;
    avatar_url: string;
}

export function useEditProfile() {
    const { user } = usePrivy();
    const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
    const [formData, setFormData] = useState<Profile>({
        username: '',
        display_name: '',
        bio: '',
        avatar_url: ''
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('username, display_name, bio, avatar_url')
                .eq('privy_id', user.id)
                .single();

            if (error) throw error;
            if (data) {
                setOriginalProfile(data);
                setFormData(data);
            }
        } catch (err) {
            setError('Failed to load profile');
            console.error('Error loading profile:', err);
        }
    };

    const handleUpdateAvatar = async (uri: string) => {
        try {
            setUploading(true);
            setError(null);

            // Create a new filename
            const filename = `avatar-${user?.id}-${Date.now()}.jpg`;
            const filePath = `avatars/${filename}`;

            // Convert uri to blob
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (err) {
            setError('Failed to upload image');
            console.error('Error uploading avatar:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleFieldChange = (field: keyof Profile, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            if (!user) throw new Error('No user found');

            // Validate username format
            if (formData.username) {
                const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
                if (!usernameRegex.test(formData.username)) {
                    throw new Error('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
                }
            }

            // Check username uniqueness if changed
            if (originalProfile && formData.username !== originalProfile.username) {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('privy_id')
                    .eq('username', formData.username)
                    .not('privy_id', 'eq', user.id)
                    .single();

                if (existingUser) {
                    throw new Error('Username already taken');
                }
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    username: formData.username,
                    display_name: formData.display_name,
                    bio: formData.bio,
                    avatar_url: formData.avatar_url,
                })
                .eq('privy_id', user.id);

            if (updateError) throw updateError;

            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save profile');
            console.error('Error saving profile:', err);
        } finally {
            setSaving(false);
        }
    };

    return {
        formData,
        uploading,
        saving,
        error,
        handleUpdateAvatar,
        handleFieldChange,
        handleSave,
    };
}