// components/UserSearch.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    Animated,
    Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useUserSearch } from '@/features/profile/hooks/useUserSearch';
import { Search as SearchIcon, X as XIcon, Clock as ClockIcon } from 'lucide-react-native';

interface User {
    privy_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

export function UserSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const {
        searchResults,
        searchHistory,
        loading,
        searchUsers,
        addToHistory,
        removeFromHistory,
        clearHistory,
        cleanup
    } = useUserSearch();
    const inputRef = useRef<TextInput>(null);
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const handleSearchPress = () => {
        setIsSearchActive(true);
        inputRef.current?.focus();
        Animated.spring(animation, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const handleCancel = () => {
        setIsSearchActive(false);
        setSearchTerm('');
        Keyboard.dismiss();
        Animated.spring(animation, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const handleSearch = (text: string) => {
        setSearchTerm(text);
        searchUsers(text);
    };

    const navigateToProfile = async (user: User) => {
        await addToHistory(user);
        handleCancel();
        router.push(`/profile/${user.privy_id}`);
    };

    // Render collapsed search bar when not active
    if (!isSearchActive) {
        return (
            <TouchableOpacity
                onPress={handleSearchPress}
                className="bg-black px-4 py-2"
            >
                <View className="flex-row items-center bg-gray-900 rounded-lg px-3 py-2">
                    <SearchIcon size={20} color="#666" />
                    <Text className="text-gray-400 ml-2">Search users...</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View className="bg-black px-4 py-2">
            <View className="flex-row items-center">
                <Animated.View
                    style={{
                        flex: 1,
                        transform: [{
                            translateX: animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, 0]
                            })
                        }]
                    }}
                >
                    <View className="flex-row items-center bg-gray-900 rounded-lg px-3 py-2">
                        <SearchIcon size={20} color="#666" />
                        <TextInput
                            ref={inputRef}
                            value={searchTerm}
                            onChangeText={handleSearch}
                            placeholder="Search users..."
                            placeholderTextColor="#666"
                            className="flex-1 ml-2 text-white font-medium"
                            autoFocus
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <XIcon size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                <TouchableOpacity
                    onPress={handleCancel}
                    className="ml-4"
                >
                    <Text className="text-[#00F6FB] font-medium">Cancel</Text>
                </TouchableOpacity>
            </View>

            {/* Search Results or History */}
            <View className="mt-2">
                {loading ? (
                    <ActivityIndicator color="#00F6FB" className="py-4" />
                ) : searchTerm.length > 0 ? (
                    // Search Results
                    <>
                        {searchResults.map((user) => (
                            <TouchableOpacity
                                key={user.privy_id}
                                className="flex-row items-center py-3 px-2"
                                onPress={() => navigateToProfile(user)}
                            >
                                <Image
                                    source={user.avatar_url || "/api/placeholder/40/40"}
                                    className="w-10 h-10 rounded-full"
                                />
                                <View className="ml-3 flex-1">
                                    <Text className="text-white font-medium">{user.display_name}</Text>
                                    <Text className="text-gray-400">@{user.username}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {searchResults.length === 0 && (
                            <Text className="text-gray-400 text-center py-4">
                                No users found
                            </Text>
                        )}
                    </>
                ) : (
                    // Search History
                    <>
                        <View className="flex-row justify-between items-center py-2">
                            <Text className="text-gray-400 font-medium">Recent Searches</Text>
                            {searchHistory.length > 0 && (
                                <TouchableOpacity onPress={clearHistory}>
                                    <Text className="text-[#00F6FB]">Clear All</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {searchHistory.map((user) => (
                            <TouchableOpacity
                                key={user.privy_id}
                                className="flex-row items-center py-3 px-2"
                                onPress={() => navigateToProfile(user)}
                            >
                                <ClockIcon size={20} color="#666" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-white font-medium">{user.display_name}</Text>
                                    <Text className="text-gray-400">@{user.username}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeFromHistory(user.privy_id)}
                                    className="p-2"
                                >
                                    <XIcon size={16} color="#666" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                        {searchHistory.length === 0 && (
                            <Text className="text-gray-400 text-center py-4">
                                No recent searches
                            </Text>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}