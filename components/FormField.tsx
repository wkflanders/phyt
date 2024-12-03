import { useState } from "react";

import { View, TextInput, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';

import { icons } from "@/constants";

interface FormFieldProps {
    title: string;
    value: string;
    placeholder?: string;
    handleChangeText: (e: string) => void;
    otherStyles?: string;
    keyboardType?: string;
    error?: string;
    secureTextEntry?: boolean;
}

export const FormField = ({
    title,
    value,
    placeholder,
    handleChangeText,
    otherStyles,
    keyboardType,
    error,
    secureTextEntry
}: FormFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = secureTextEntry || title.toLowerCase().includes('password');

    return (
        <View className={`space-y-2 ${otherStyles}`}>
            <View className="w-full h-16 bg-phyt_form px-4 pb-2 items-center border-2 border-phyt_form_border flex-row rounded-2xl">
                <TextInput
                    className="flex-1 text-white text-xl font-incsemibold h-full"
                    value={value}
                    placeholder={placeholder}
                    placeholderTextColor="phyt_form_placeholder"
                    onChangeText={handleChangeText}
                    secureTextEntry={isPasswordField && !showPassword}
                />
                {isPasswordField && (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Image source={!showPassword ? icons.eye : icons.eyehide} className="w-8 h-8 pt-2" resizeMode='contain' />
                    </TouchableOpacity>
                )}
            </View>
            {error && (
                <Text className="text-red-500 text-sm ">
                    {error}
                </Text>
            )}
        </View >
    );
};