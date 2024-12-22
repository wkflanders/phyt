import { View, Text, Image } from 'react-native';
import { Icon } from '@/components/Icon';
import { Wallet } from '@/features/wallet/components/Wallet';
import { usePrivy } from "@privy-io/expo";
import { router } from 'expo-router';

import icons from "@/constants/icons";
import images from "@/constants/images";

const Header = () => {
    const { user } = usePrivy();

    const showWallet = () => {

    };

    const handleProfilePress = () => {
        router.push(`/profile/${user?.id}`);
    };
    return (
        <View className="flex flex-row bg-black h-[10vh] justify-center items-center">
            <View className="mr-4">
                <Icon
                    icon={icons.message}
                    onPress={() => {

                    }}
                    label={'messages'}
                />
            </View>
            <View className="mr-4">
                <Icon
                    icon={icons.profile}
                    onPress={() => {
                        handleProfilePress();
                    }}
                    label={'profile'}
                />
            </View>
            <View className="mx-4">
                <Image
                    source={images.logo}
                    className='w-[110px]'
                    resizeMode="contain"
                />
            </View>
            <Wallet />
            <View className="ml-4">
                <Icon
                    icon={icons.settings}
                    onPress={() => {

                    }}
                    label={'settings'}
                />
            </View>
        </View>
    );
};

export default Header;