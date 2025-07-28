import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function KeypadScreen() {
  const [display, setDisplay] = useState('');

  // Simple number formatting function
  const formatNumber = (numStr: string) => {
    if (numStr === '') return '';
    // Remove any existing dots first
    const cleanNum = numStr.replace(/\./g, '');
    // Add dots every 3 digits from right
    return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const inputBorderColor = useThemeColor({}, 'inputBorder');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');

  const handleNumberPress = (number: string) => {
    setDisplay(prev => {
      // If it's a decimal point, check if one already exists
      if (number === '.') {
        if (prev.includes('.')) return prev; // Don't add another decimal
        if (prev === '') return '0.'; // Start with 0. if empty
        return prev + number;
      }
      // For regular numbers
      if (prev === '0' && number !== '.') {
        return number; // Replace leading 0
      }

      // Add the new number
      const newValue = prev + number;

      // Simple formatting: add dots every 3 digits from right
      if (!newValue.includes('.')) {
        // Format whole numbers
        return formatNumber(newValue);
      } else {
        // Handle decimal numbers
        const parts = newValue.split('.');
        const wholePart = formatNumber(parts[0]);
        return wholePart + '.' + parts[1];
      }
    });
  };

  const handleClear = () => {
    setDisplay('');
  };

  const handleDelete = () => {
    setDisplay(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    // Handle keypad submission logic here
    console.log('Keypad submitted:', display);
    setDisplay('');
  };

  const renderKey = (key: string, type: 'number' | 'action' = 'number') => (
    <TouchableOpacity
      key={key}
      style={[
        styles.key,
        { backgroundColor: type === 'action' ? buttonPrimaryColor : cardBackgroundColor },
        { borderColor: inputBorderColor },
      ]}
      onPress={() => {
        if (type === 'action') {
          if (key === 'C') handleClear();
          else if (key === '⌫') handleDelete();
          else if (key === '✓') handleSubmit();
        } else {
          handleNumberPress(key);
        }
      }}
      activeOpacity={0.7}
    >
      <ThemedText
        style={[
          styles.keyText,
          { color: type === 'action' ? buttonPrimaryTextColor : primaryTextColor },
        ]}
      >
        {key}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>Keypad</ThemedText>
        </ThemedView>

        <View style={styles.content}>
          <View style={styles.displayContainer}>
            <ThemedView
              style={[
                styles.display,
                { backgroundColor: cardBackgroundColor, borderColor: inputBorderColor },
              ]}
            >
              <ThemedText style={[styles.displayText, { color: primaryTextColor }]}>
                {display || '0'}
              </ThemedText>
            </ThemedView>
          </View>

          <View style={styles.keypad}>
            <View style={styles.numberPad}>
              <View style={styles.row}>
                {renderKey('1')}
                {renderKey('2')}
                {renderKey('3')}
              </View>
              <View style={styles.row}>
                {renderKey('4')}
                {renderKey('5')}
                {renderKey('6')}
              </View>
              <View style={styles.row}>
                {renderKey('7')}
                {renderKey('8')}
                {renderKey('9')}
              </View>
              <View style={styles.row}>
                {renderKey('C', 'action')}
                {renderKey('0')}
                {renderKey('.')}
              </View>
              <View style={styles.row}>{renderKey('⌫', 'action')}</View>
            </View>

            <View style={styles.okButtonContainer}>
              <TouchableOpacity
                style={[styles.okButton, { backgroundColor: buttonPrimaryColor }]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.okButtonText, { color: buttonPrimaryTextColor }]}>
                  OK
                </ThemedText>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  displayContainer: {
    marginBottom: 32,
  },
  display: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'flex-end',
    borderWidth: 1,
  },
  displayText: {
    fontSize: 32,
    fontWeight: '600',
  },
  keypad: {
    flex: 1,
    justifyContent: 'space-between',
  },
  numberPad: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 0,
  },
  okButtonContainer: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  key: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
  },
  okButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  okButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
