import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ArrowLeft, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCurrency } from '@/context/CurrencyContext';

export default function AddTicketScreen() {
  const [mintUrl, setMintUrl] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');

  // Currency context
  const { getCurrentCurrencySymbol } = useCurrency();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const inputBorderColor = useThemeColor({}, 'inputBorder');

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    if (!mintUrl.trim() || !unit.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Here you would save the ticket data
    console.log('Adding ticket:', { mintUrl, unit, price });

    // Navigate back to tickets page
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={primaryTextColor} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
            Add Ticket
          </ThemedText>
        </ThemedView>

        <View style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: primaryTextColor }]}>Mint URL</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: inputBorderColor,
                    color: primaryTextColor,
                  },
                ]}
                value={mintUrl}
                onChangeText={setMintUrl}
                placeholder="Enter mint URL"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: primaryTextColor }]}>Unit</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: inputBorderColor,
                    color: primaryTextColor,
                  },
                ]}
                value={unit}
                onChangeText={setUnit}
                placeholder="Enter unit"
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: primaryTextColor }]}>
                Price ({getCurrentCurrencySymbol()})
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: inputBorderColor,
                    color: primaryTextColor,
                  },
                ]}
                value={price}
                onChangeText={setPrice}
                placeholder={`Enter price in ${getCurrentCurrencySymbol()}`}
                placeholderTextColor={secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: buttonPrimaryColor }]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Check size={24} color={buttonPrimaryTextColor} />
              <ThemedText style={[styles.saveButtonText, { color: buttonPrimaryTextColor }]}>
                Save Ticket
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  form: {
    flex: 1,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  saveButtonContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: 20,
    marginRight: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
