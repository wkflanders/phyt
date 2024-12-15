import { useState } from 'react';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';

import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLoginWithEmail } from '@privy-io/expo';
import { useEmbeddedWallet, isNotCreated } from '@privy-io/expo';

import { FormField } from '@/components/FormField';
import { FunctionalButton } from '@/components/FunctionalButton';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/Dialog';
import { ConfirmationCodeField } from '@/components/confirmation-code-field/ConfirmationCodeField';
import { router } from 'expo-router';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { initSupabaseUser } = useSupabaseUser();

    const wallet = useEmbeddedWallet();

    const { state, sendCode, loginWithCode } = useLoginWithEmail({
        onError: (err) => {
            console.log(err);
            setError(JSON.stringify(err.message));
        },
        onLoginSuccess: async (user) => {
            try {
                await initSupabaseUser(user);

                if (isNotCreated(wallet)) {
                    wallet.create({ recoveryMethod: 'privy' });
                }

                router.push('/(auth)/onboard');
            } catch (error) {
                console.error('Error creating supabase user:', error);
                setError('Failed to create user profile');
            }
        }
    });

    const signInWithEmail = async () => {
        setIsSubmitting(true);
        sendCode({ email });
        setIsSubmitting(false);
    };

    const confirmEmail = async (value: string) => {
        loginWithCode({ code: value, email: email });
    };

    return (
        <SafeAreaView className="bg-black h-full">
            <ScrollView>
                <Dialog
                    open={state.status === 'awaiting-code-input' || state.status === 'sending-code'}
                >
                    <DialogContent
                        className='w-full h-full bg-black justify-start mt-[28rem]'
                    >
                        <ConfirmationCodeField onCodeComplete={confirmEmail} />
                    </DialogContent>
                </Dialog>
                <View className="justify-center min-h-[80vh]">
                    <View className="w-full justify-center items-center px-4">
                        <Text className="font-intersemibold color-white text-3xl">
                            What's your email address?
                        </Text>
                        <Text className="font-intersemibold text-xl color-phyt_text_secondary text-center mt-4">
                            We only need your email to log you in. We keep your email private and won't send spam.
                        </Text>
                    </View>
                    <View className="w-full justify-center items-center px-2">
                        <FormField
                            title="Email"
                            value={email}
                            handleChangeText={(e) => setEmail(e)}
                            otherStyles="mt-5"
                            placeholder="EMAIL"
                            keyboardType='email-address'
                        />
                        <FunctionalButton
                            title="Submit"
                            handlePress={signInWithEmail}
                            containerStyles="mt-14 w-full py-6 rounded-xl"
                            textStyles="font-intersemibold"
                            isLoading={isSubmitting}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView >
    );
};

export default SignIn;