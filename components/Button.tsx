import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ButtonProps {
    title: string;
    handlePress: () => void;
    containerStyles?: string;
    textStyles?: string;
    isLoading: boolean;
    borderRadius?: number;
}

const Button = ({
    title,
    handlePress,
    containerStyles,
    textStyles,
    isLoading,
    borderRadius = 50,
}: ButtonProps) => {
    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            className={`bg-phyt_red min-h-[40px] w-1/2 flex flex-row justify-center items-center ${containerStyles} ${isLoading ? "opacity-50" : ""}`}
            style={{ borderRadius }}
            disabled={isLoading}
        >
            <Text className={`text-white font-incsemibold text-xl ${textStyles}`}>
                {title}
            </Text>

            {isLoading && (
                <ActivityIndicator
                    animating={isLoading}
                    color="#fff"
                    size="small"
                    className="ml-2"
                />
            )}
        </TouchableOpacity>
    );
};

export default Button;