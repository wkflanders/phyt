import { View } from 'react-native';
import { Icon } from '@/components/Icon';

import { useEmbeddedWallet, isConnected, needsRecovery } from '@privy-io/expo';

import icons from '@/constants/icons';

export const Wallet = () => {



    return (
        <View className="ml-4">
            <Icon
                icon={icons.wallet}
                onPress={() => {

                }}
                label={'wallet'}
            />
        </View>
    );
};