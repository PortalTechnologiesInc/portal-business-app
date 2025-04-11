import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack initialRouteName="onboarding">
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home"
        }}
      />
    </Stack>
  );
}