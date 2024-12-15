import { View, Text, TouchableOpacity, Image } from 'react-native';

interface ProfileHeaderProps {
    profile: any;
    followStats: { followers: number; following: number; };
    isOwnProfile: boolean;
    isFollowing: boolean;
    onFollowPress: () => void;
    onFollowersPress: () => void;
    onFollowingPress: () => void;
    onEditPress: () => void;
}

export function ProfileHeader({
    profile,
    followStats,
    isOwnProfile,
    isFollowing,
    onFollowPress,
    onFollowersPress,
    onFollowingPress,
    onEditPress,
}: ProfileHeaderProps) {
    return (
        <View className="p-4">
            <View className="flex-row items-center">
                <Image
                    source={{ uri: profile?.avatar_url || "/api/placeholder/80/80" }}
                    className="w-20 h-20 rounded-full"
                />

                <View className="ml-4 flex-1">
                    <Text className="text-xl text-white font-bold">{profile?.display_name}</Text>
                    <Text className="text-gray-400">@{profile?.username}</Text>

                    <View className="flex-row mt-2 space-x-4">
                        <TouchableOpacity onPress={onFollowersPress}>
                            <Text className="text-white">
                                <Text className="font-bold">{followStats.followers}</Text>
                                {' Followers'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onFollowingPress}>
                            <Text className="text-white">
                                <Text className="font-bold">{followStats.following}</Text>
                                {' Following'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isOwnProfile ? (
                    <TouchableOpacity
                        className="bg-gray-800 px-4 py-2 rounded-md"
                        onPress={onEditPress}
                    >
                        <Text className="text-white font-semibold">Edit</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className={`px-4 py-2 rounded-md ${isFollowing ? 'bg-gray-800' : 'bg-[#00F6FB]'}`}
                        onPress={onFollowPress}
                    >
                        <Text className={`font-semibold ${isFollowing ? 'text-white' : 'text-black'}`}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}