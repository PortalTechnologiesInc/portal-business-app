import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();

  const handleClearAppData = () => {
    Alert.alert(
      "Clear App Data",
      "This will reset all app data and take you back to onboarding. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear Data", 
          style: "destructive",
          onPress: async () => {
            await resetOnboarding();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color={Colors.almostWhite} />
          </TouchableOpacity>
          <ThemedText
            style={styles.headerText}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Settings
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText
            style={styles.text}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Settings Page
          </ThemedText>
          
          <TouchableOpacity 
            style={styles.clearDataButton} 
            onPress={handleClearAppData}
          >
            <ThemedText style={styles.clearDataButtonText}>
              Clear App Data
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 40,
  },
  clearDataButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  clearDataButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
