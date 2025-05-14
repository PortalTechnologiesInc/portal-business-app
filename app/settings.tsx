import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, TextInput, Image, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUserProfile } from '@/context/UserProfileContext';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  const { username, avatarUri, setUsername, setAvatarUri } = useUserProfile();
  
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (username) {
      setUsernameInput(username.replace('@getportal.cc', ''));
    }
  }, [username]);

  const handleAvatarPress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to allow access to your photos to change your avatar.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        await setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      
      // Even if username is empty, we still append @getportal.cc
      // This ensures pubkey format is consistent regardless of username presence
      const fullUsername = usernameInput.trim() + '@getportal.cc';
      await setUsername(fullUsername);
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            try {
              // Clear user profile data but maintain pubkey format
              await setUsername('');
              await setAvatarUri(null);
              
              // Reset onboarding state (this navigates to onboarding screen)
              await resetOnboarding();
            } catch (error) {
              console.error('Error clearing app data:', error);
              Alert.alert('Error', 'Failed to clear app data. Please try again.');
            }
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
            <ArrowLeft size={20} color={Colors.almostWhite} />
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
          {/* Profile Section */}
          <ThemedView style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color={Colors.almostWhite} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Pencil size={12} color={Colors.almostWhite} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.usernameContainer}>
              <TextInput
                style={styles.usernameInput}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="username"
                placeholderTextColor={Colors.gray}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ThemedText style={styles.usernameSuffix}>@getportal.cc</ThemedText>
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <ThemedText style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Profile'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* App Settings Section */}
          <ThemedView style={styles.appSettingsSection}>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    width: 175,
    height: 175,
    marginBottom: 24,
  },
  avatar: {
    width: 175,
    height: 175,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: Colors.almostWhite,
  },
  avatarPlaceholder: {
    width: 175,
    height: 175,
    borderRadius: 99,
    backgroundColor: Colors.darkGray,
    borderWidth: 2,
    borderColor: Colors.almostWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.darkGray,
    width: 35,
    height: 35,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.almostWhite,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    marginBottom: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  usernameInput: {
    color: Colors.almostWhite,
    fontSize: 16,
    flex: 1,
    paddingVertical: 8,
  },
  usernameSuffix: {
    color: Colors.gray,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.darkGray,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  saveButtonText: {
    color: Colors.almostWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.darkGray,
    width: '100%',
    marginVertical: 20,
  },
  appSettingsSection: {
    alignItems: 'center',
    width: '100%',
  },
  clearDataButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    alignSelf: 'center',
  },
  clearDataButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
