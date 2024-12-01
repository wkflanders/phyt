import { useState } from 'react';

import { Alert, View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { images } from "@/constants";

import FormField from '@/components/FormField';
import Button from '@/components/Button';

const SignIn = () => {
    const [form, setForm] = useState({
        email: '',
        password: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const signInWithEmail = async () => {
        setIsSubmitting(true);

        setIsSubmitting(false);
    };

    const submit = () => {

    };

    return (
        <SafeAreaView className="bg-phyt_blue h-full">
            <ScrollView>
                <View className="justify-center min-h-[80vh]">
                    <View className="w-full justify-center items-center px-4">
                        <Text className="color-phyt_red font-incsemibold text-2xl pb-2">
                            welcome to
                        </Text>
                        <Image
                            source={images.onboard_logo}
                            className='w-[200px] h-[84px]'
                            resizeMode="contain"
                        />
                    </View>
                    <View className="w-full justify-center items-center px-12">
                        <FormField
                            title="Email"
                            value={form.email}
                            handleChangeText={(e) => setForm({ ...form, email: e })}
                            otherStyles="mt-5"
                            placeholder="EMAIL"
                            keyboardType='email-address'
                        />
                        <FormField
                            title="Password"
                            value={form.password}
                            handleChangeText={(e) => setForm({ ...form, password: e })}
                            placeholder="PASSWORD"
                            otherStyles="mt-5"
                        />

                        <Button
                            title="LOGIN"
                            handlePress={submit}
                            containerStyles="mt-10"
                            isLoading={isSubmitting}
                        />

                        <View className="justify-center pt-5 flex-row gap-2">
                            <Link href="/sign-up" className="font-incsemibold color-phyt_red underline underline-offset-5">
                                or sign up
                            </Link>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SignIn;