import { View, Text, Image } from 'react-native';
import { Tabs, Redirect } from 'expo-router';

import { icons } from '../../constants';

type TabIconProps = {
    icon: any;
    color: any;
    name: any;
    focused: any;
};

const TabIcon = ({ icon, color, name, focused }: TabIconProps) => {
    return (
        <View className="items-center justify-center min-w-[60px] flex-1 pt-3">
            <Image
                source={icon}
                resizeMode="contain"
                tintColor={color}
                className="h-6 w-6"
            />
            <Text
                className={`${focused ? 'font-incsemibold' : 'font-incregular'} text-xs mt-1`}
                style={{ color: color }}
            >
                {name}
            </Text>
        </View>
    );
};

const TabsLayout = () => {
    return (
        <>
            <Tabs
                screenOptions={{
                    tabBarShowLabel: false,
                    tabBarActiveTintColor: '#0EF9FE',
                    tabBarInactiveTintColor: '#7D7D7D',
                    tabBarStyle: {
                        backgroundColor: '#151515',
                        borderTopWidth: 1,
                        borderTopColor: 'black',
                        position: 'absolute',
                        height: 100,
                        bottom: 0,
                        paddingRight: 30,
                        paddingLeft: 30,
                        paddingTop: 10,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: "Home",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.home}
                                color={color}
                                name="Home"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="play"
                    options={{
                        title: "Play",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.play}
                                color={color}
                                name="Play"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="run"
                    options={{
                        title: "Run",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.run}
                                color={color}
                                name="Run"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="leaderboard"
                    options={{
                        title: "Leaderboard",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.leaderboard}
                                color={color}
                                name="Leaderboard"
                                focused={focused}
                            />
                        )
                    }}
                />
            </Tabs>
        </>
    );
};

export default TabsLayout;