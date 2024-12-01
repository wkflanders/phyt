import { useState } from 'react';

import { Alert, View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { images } from "@/constants";

import FormField from '@/components/FormField';
import Button from '@/components/Button';

const SignUp = () => {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validatePasswords = () => {
        let isValid = true;
        const newErrors = {
            password: '',
            confirmPassword: ''
        };

        if (form.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const signUpWithEmail = async () => {
        setIsSubmitting(true);

    };

    const submit = () => {
        if (validatePasswords()) {
            setIsSubmitting(true);
            // Add your signup logic here
        }
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
                            title="Username"
                            value={form.username}
                            handleChangeText={(e) => setForm({ ...form, username: e })}
                            otherStyles="mt-5"
                            placeholder="USERNAME"
                        />
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
                            handleChangeText={(e) => {
                                setForm({ ...form, password: e });
                                setErrors({ ...errors, password: '' });
                            }}
                            placeholder="PASSWORD"
                            otherStyles="mt-5"
                            error={errors.password}
                            secureTextEntry
                        />
                        <FormField
                            title="Confirm Password"
                            value={form.confirmPassword}
                            handleChangeText={(e) => {
                                setForm({ ...form, confirmPassword: e });
                                setErrors({ ...errors, confirmPassword: '' });
                            }}
                            placeholder="RETYPE PASSWORD"
                            otherStyles="mt-5"
                            error={errors.confirmPassword}
                            secureTextEntry
                        />
                        <Button
                            title="SIGN UP"
                            handlePress={submit}
                            containerStyles="mt-10"
                            isLoading={isSubmitting}
                        />

                        <View className="justify-center items-center pt-5 flex-row gap-2">
                            <Link href="/sign-in" className="font-incsemibold color-phyt_red underline underline-offset-5">
                                or login
                            </Link>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SignUp;