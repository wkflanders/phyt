import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { magic } from "@/lib/magic";

import { Alert, View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { images } from "@/constants";

import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { useGlobalContext } from '@/context/GlobalProvider';

const SignIn = () => {
    const { setIsLoggedIn, setUser } = useGlobalContext();

    const [form, setForm] = useState({
        email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const signInWithEmail = async () => {
        setIsSubmitting(true);
        try {
            const didToken = await magic.auth.loginWithEmailOTP({
                email: form.email,
            });

            if (didToken) {
                await AsyncStorage.setItem('didToken', didToken); // Persisting token
                const metadata = await magic.user.getMetadata();
                setUser({ email: metadata.email! });
                setIsLoggedIn(true);
                router.replace('/home');
            }
        } catch (error) {
            console.error('Login failed', error);
            Alert.alert('Error', 'Login Ffailed, Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submit = () => {
        if (!form.email) {
            Alert.alert('Error', 'Please enter your email.');
            return;
        }
        signInWithEmail();
    };

    return (
        <SafeAreaView className="bg-black h-full">
            <ScrollView>
                <View className="justify-center min-h-[80vh]">
                    <View className="w-full justify-center items-center px-4">
                        <Text className="font-intersemibold color-white text-3xl">
                            What's your email address?
                        </Text>
                        <Text className="font-intersemibold text-xl color-phyt_text_secondary text-center mt-4">
                            We only ned your email to log you in. We keep your email private and won't send spam.
                        </Text>
                    </View>
                    <View className="w-full justify-center items-center px-2">
                        <FormField
                            title="Email"
                            value={form.email}
                            handleChangeText={(e) => setForm({ ...form, email: e })}
                            otherStyles="mt-5"
                            placeholder="EMAIL"
                            keyboardType='email-address'
                        />
                        <Button
                            title="Submit"
                            handlePress={submit}
                            containerStyles="mt-20 w-full py-6 rounded-xl"
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