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

const FormField = ({
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
            <View className="w-full h-16 bg-white px-4 pb-2 items-center border-2 border-white focus:border-phyt_red flex-row" style={{ borderRadius: 50 }}>
                <TextInput
                    className="flex-1 text-gray-800 text-xl font-incsemibold h-full"
                    value={value}
                    placeholder={placeholder}
                    placeholderTextColor="#000"
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

export default FormField;