import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
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
  },
}); 