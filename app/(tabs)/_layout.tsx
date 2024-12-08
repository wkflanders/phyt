import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Tabs, Redirect } from 'expo-router';

import { RecordScreenModal } from '@/features/record/components/RecordScreenModal';

import { icons } from '../../constants';

type TabIconProps = {
    icon: any;
    color: any;
    name: any;
    focused: any;
};

const TabIcon = ({ icon, color, name, focused }: TabIconProps) => {
    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 60,
            paddingTop: 10
        }}>
            <Image
                source={icon}
                resizeMode="contain"
                style={{
                    tintColor: color,
                    width: 24,
                    height: 24,
                    marginBottom: 5,
                }}
            />
            <Text
                style={{
                    color: color,
                    fontSize: 12,
                    fontWeight: focused ? '600' : '400',
                }}
                className="font-intersemibold"
            >
                {name}
            </Text>
        </View>
    );
};

const TabsLayout = () => {
    return (
        <View style={{ flex: 1 }}>
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
                    name="record"
                    options={{
                        title: "Record",
                        headerShown: false,
                        tabBarIcon: () => null,
                        tabBarButton: () => <RecordScreenModal />,
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
                        ),
                    }}
                />
            </Tabs>
        </View>
    );
};

export default TabsLayout;