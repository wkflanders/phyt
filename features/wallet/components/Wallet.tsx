import React, { useState, useCallback, useEffect } from 'react';
import { View, Modal, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Icon } from '@/components/Icon';
import { router } from 'expo-router';
import { usePrivy, useEmbeddedWallet, getUserEmbeddedEthereumWallet, EIP1193Provider, isNotCreated } from '@privy-io/expo';
import { useSetActiveWallet } from 'thirdweb/react';
import { EIP1193 } from "thirdweb/wallets";
import { client } from '@/lib/thirdweb';

import icons from '@/constants/icons';

export const Wallet = () => {
    const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
    const [signedMessages, setSignedMessages] = useState<string[]>([]);

    const { user } = usePrivy();
    const wallet = useEmbeddedWallet();
    const account = getUserEmbeddedEthereumWallet(user);

    const setActiveWallet = useSetActiveWallet();

    // Privy thirdweb adapter
    useEffect(() => {
        const setActive = async () => {
            if (wallet) {
                const ethersProvider = await wallet.getProvider();

                const thirdwebWallet = EIP1193.fromProvider({
                    provider: ethersProvider
                });
                await thirdwebWallet.connect({
                    client: client,
                });

                setActiveWallet(thirdwebWallet);
            }
        };
        setActive();
    }, []);

    const handleWalletPress = async () => {
        if (!user) {
            router.push('/(auth)/sign-in');
            return;
        }

        setIsWalletModalVisible(true);
    };

    const signMessage = useCallback(
        async (provider: EIP1193Provider) => {
            try {
                const message = await provider.request({
                    method: "personal_sign",
                    params: [`0x0${Date.now()}`, account?.address],
                });
                if (message && typeof message === 'string') {
                    setSignedMessages((prev) => prev.concat(message));
                }

            } catch (e) {
                console.error(e);
            }
        },
        [account?.address]
    );

    return (
        <>
            <View className="ml-4">
                <Icon
                    icon={icons.wallet}
                    onPress={() => {
                        handleWalletPress();
                    }}
                    label={'wallet'}
                />
            </View>
            <Modal
                visible={isWalletModalVisible}
                animationType={'slide'}
                transparent={true}
                onRequestClose={() => setIsWalletModalVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-phyt_bg rounded-t-3xl p-6 pb-20">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-xl text-white font-bold">Wallet</Text>
                            <TouchableOpacity
                                onPress={() => setIsWalletModalVisible(false)}
                                className="p-2"
                            >
                                <Text className="text-white">Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="space-y-4">
                            {account?.address && (
                                <View className="p-4 rounded-lg">
                                    <Text className="text-white font-bold mb-2">Your Wallet</Text>
                                    <Text
                                        className="text-white font-mono text-md"
                                        selectable={true}
                                    >{account.address}</Text>
                                </View>
                            )}

                            {wallet.status === "connecting" && (
                                <Text className="text-gray-500">Loading wallet...</Text>
                            )}

                            {wallet.status === "error" && (
                                <Text className="text-red-500">{wallet.error}</Text>
                            )}

                            {wallet.status === "not-created" && (
                                <TouchableOpacity
                                    className="bg-blue-500 p-4 rounded-lg"
                                    onPress={() => wallet.create()}
                                >
                                    <Text className="text-white text-center">Create Wallet</Text>
                                </TouchableOpacity>
                            )}

                            {wallet.status === "connected" && (
                                <TouchableOpacity
                                    className="bg-phyt_red p-4 rounded-lg"
                                    onPress={() => signMessage(wallet.provider)}
                                >
                                    <Text className="text-white text-center">Sign Message</Text>
                                </TouchableOpacity>
                            )}

                            {signedMessages.length > 0 && (
                                <View className="space-y-2">
                                    {signedMessages.map((message) => (
                                        <View
                                            key={message}
                                            className="py-2"
                                        >
                                            <Text className="text-sm text-gray-500 italic"
                                                selectable={true}
                                            >
                                                {message}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};