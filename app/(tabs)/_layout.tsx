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
                        backgroundColor: '#101010',
                        borderTopWidth: 1,
                        borderTopColor: '#232533',
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
                    name="skills"
                    options={{
                        title: "Skills",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.skills}
                                color={color}
                                name="Skills"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="friends"
                    options={{
                        title: "Friends",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.friends}
                                color={color}
                                name="Friends"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="challenges"
                    options={{
                        title: "Challenges",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.challenges}
                                color={color}
                                name="Challenges"
                                focused={focused}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="rewards"
                    options={{
                        title: "Rewards",
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon
                                icon={icons.rewards}
                                color={color}
                                name="Rewards"
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