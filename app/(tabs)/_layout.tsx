import { Tabs } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.almostWhite,
                tabBarInactiveTintColor: Colors.darkGray,
                headerShown: false,
                tabBarStyle: {
                    paddingTop: 16,
                    alignItems: 'center', // Align items vertically
                    backgroundColor: '#000',
                    height: 80,
                    borderTopWidth: 0,
                },
            }}
        >
            <Tabs.Screen
                name="ActivityList"
                options={{
                    title: 'Activities',
                    tabBarIcon: ({ color, focused }) => (
                        <FontAwesome6 name="list-ul" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="IdentityList"
                options={{
                    title: 'Identities',
                    tabBarIcon: ({ color, focused }) => (
                        <FontAwesome6 name="id-badge" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
