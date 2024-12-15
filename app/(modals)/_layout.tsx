// app/(modals)/_layout.tsx
import { Stack } from 'expo-router';

export default function ModalsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: 'black',
                },
                headerTintColor: 'white',
                headerTitleStyle: {
                    fontFamily: 'Inter-Medium',
                },
                // Make modals slide up from bottom
                presentation: 'modal',
                // Add animation configurations
                animation: 'slide_from_bottom',
                // Optional: Add custom styling
                contentStyle: {
                    backgroundColor: 'black',
                },
                // Ensure proper status bar handling
                statusBarStyle: 'light',
                statusBarAnimation: 'fade',
            }}
        >
            <Stack.Screen
                name="profile/[id]"
                options={{
                    title: 'Profile',
                    // These will be merged with screenOptions
                    headerBackTitle: '', // iOS back button text
                    headerTitleAlign: 'center',
                }}
            />

            <Stack.Screen
                name="profile/edit"
                options={{
                    title: 'Edit Profile',
                    headerTitleAlign: 'center',
                }}
            />

            <Stack.Screen
                name="profile/followers"
                options={{
                    title: 'Followers',
                    headerTitleAlign: 'center',
                }}
            />

            <Stack.Screen
                name="profile/following"
                options={{
                    title: 'Following',
                    headerTitleAlign: 'center',
                }}
            />
        </Stack>
    );
}