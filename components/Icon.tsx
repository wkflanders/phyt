import { View, Text, Image, TouchableOpacity } from 'react-native';

type IconProps = {
    icon: any;
    color?: string;
    size?: number;
    onPress: () => void;
    label?: string;
    showLabel?: boolean;
};

export const Icon = ({
    icon,
    color = '#FFFFFF',
    size = 24,
    onPress,
    label,
    showLabel = false
}: IconProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="items-center justify-center"
        >
            <Image
                source={icon}
                resizeMode="contain"
                tintColor={color}
                className={`h-[${size}px] w-[${size}px]`}
            />
            {showLabel && label && (
                <Text
                    className="font-incregular text-xs mt-1"
                    style={{ color }}
                >
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    );
};