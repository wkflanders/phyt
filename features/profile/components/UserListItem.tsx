import { TouchableOpacity, Image, Text, View } from 'react-native';
import { router } from 'expo-router';

interface UserListItemProps {
    user: {
        privy_id: string;
        username: string;
        display_name: string;
        avatar_url: string;
    };
}

export function UserListItem({ user }: UserListItemProps) {
    return (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-800"
            onPress={() => router.push(`/(modals)/profile/${user.privy_id}`)}
        >
            <Image
                source={{ uri: user.avatar_url || "/api/placeholder/40/40" }}
                className="w-10 h-10 rounded-full"
            />
            <View className="ml-3">
                <Text className="text-white font-semibold">{user.display_name}</Text>
                <Text className="text-gray-400">@{user.username}</Text>
            </View>
        </TouchableOpacity>
    );
}