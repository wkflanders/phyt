import { View, Text, Image } from 'react-native';
import { Icon } from '@/components/Icon';
import { Wallet } from '@/components/Wallet';

import icons from "@/constants/icons";
import images from "@/constants/images";

const Header = () => {
    const showWallet = () => {

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