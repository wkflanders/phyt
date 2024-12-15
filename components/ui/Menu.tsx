import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

interface MenuItem {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

interface MenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: MenuItem[];
}

export const Menu: React.FC<MenuProps> = ({ open, onOpenChange, items }) => {
    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={() => onOpenChange(false)}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-end"
                onPress={() => onOpenChange(false)}
            >
                <View className="bg-phyt_form rounded-t-3xl overflow-hidden mb-2">
                    {items.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => {
                                if (!item.disabled) {
                                    item.onPress();
                                }
                            }}
                            disabled={item.disabled}
                            className={`p-6 border-b border-phyt_form_border ${item.disabled ? 'opacity-50' : ''}`}
                        >
                            <Text className="text-white text-center text-lg font-intersemibold">
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        onPress={() => onOpenChange(false)}
                        className="p-4"
                    >
                        <Text className="text-phyt_text_secondary text-center text-lg font-intersemibold">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};