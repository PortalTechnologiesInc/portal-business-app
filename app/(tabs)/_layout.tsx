import { Tabs } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#ffd33d',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#000',
                    height: 75,
                },
                headerTintColor: '#fff',
                headerStyle: {
                    backgroundColor: '#000',
                    height: 75,
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
