import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle, ImageStyle } from 'react-native';

type IconProps = {
    icon: any;
    color?: string;
    size?: number;
    onPress: () => void;
    label?: string;
    showLabel?: boolean;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
};

export const Icon = ({
    icon,
    color = '#FFFFFF',
    size = 24,
    onPress,
    label,
    showLabel = false,
    style,
    imageStyle
}: IconProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="items-center justify-center"
            style={style}
        >
            <Image
                source={icon}
                resizeMode="contain"
                tintColor={color}
                style={[
                    {
                        height: size,
                        width: size
                    },
                    imageStyle
                ]}
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