import { Stack } from 'expo-router';

export default function ProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: "black",
                },
                headerTintColor: "white",
                headerTitleStyle: {
                    fontFamily: "Inter-Medium",
                },
                headerBackTitle: "",
                headerTitleAlign: "center",
            }}
        />
    );
}