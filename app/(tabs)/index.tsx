import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCurrency } from '@/context/CurrencyContext';
import { useOperation, createChargeOperation } from '@/context/OperationContext';
import { Send, ArrowLeft } from 'lucide-react-native';
import DropdownPill from '@/components/DropdownPill';

export default function Home() {
  const [display, setDisplay] = useState('');
  const { getCurrentCurrencySymbol } = useCurrency();
  const {
    startOperation,
    addOperationStep,
    updateOperationStep,
    navigateToPending,
    completeOperation,
    failOperation,
  } = useOperation();

  // Currency formatting function
  const formatCurrency = (numStr: string) => {
    if (numStr === '') return '';

    const currencySymbol = getCurrentCurrencySymbol();

    // Handle decimal input
    if (numStr.includes('.')) {
      const parts = numStr.split('.');
      const wholePart = parts[0] || '0';
      const decimalPart = parts[1] || '';

      // Format whole part with commas
      const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      // Limit decimal to 2 places for currency
      const limitedDecimal = decimalPart.slice(0, 2);

      return `${formattedWhole}${limitedDecimal ? '.' + limitedDecimal : ''} ${currencySymbol}`;
    } else {
      // Format whole numbers
      const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${formatted} ${currencySymbol}`;
    }
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
      return prev + number;
    });
  };

  const handleClear = () => {
    setDisplay('');
  };

  const handleDelete = () => {
    setDisplay(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    const numericValue = parseFloat(display || '0');

    // Validate amount
    if (numericValue <= 0) {
      // Could show an alert here
      console.log('Invalid amount');
      return;
    }

    // Clear display
    setDisplay('');

    // Create operation data
    const operationData = createChargeOperation(numericValue, getCurrentCurrencySymbol());

    // Start the operation
    const operationId = startOperation('charge', operationData);

    // Navigate to pending screen
    navigateToPending(operationId);

    // Simulate charge process with steps
    simulateChargeProcess(operationId, numericValue, getCurrentCurrencySymbol());
  };

  // Simulate charge processing with realistic steps
  const simulateChargeProcess = async (operationId: string, amount: number, currency: string) => {
    try {
      // Step 1: Initializing payment
      addOperationStep(operationId, {
        id: 'init',
        status: 'pending',
        title: 'Initializing payment...',
        subtitle: 'Setting up your payment request',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      updateOperationStep(operationId, 'init', {
        status: 'completed',
        title: 'Payment initialized',
        subtitle: 'Payment request created successfully',
      });

      // Step 2: Processing payment
      addOperationStep(operationId, {
        id: 'process',
        status: 'pending',
        title: 'Processing payment...',
        subtitle: `Charging ${amount} ${currency}`,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate random success/failure for demo
      const isSuccess = Math.random() > 0.3; // 70% success rate

      if (isSuccess) {
        updateOperationStep(operationId, 'process', {
          status: 'success',
          title: 'Payment processed',
          subtitle: 'Your payment has been completed successfully',
        });

        // Complete the operation
        completeOperation(operationId, {
          transactionId: `txn_${Date.now()}`,
          amount,
          currency,
          status: 'completed',
        });
      } else {
        // Simulate different types of errors
        const errorTypes = ['insufficient_funds', 'network_error', 'payment_declined'] as const;
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];

        updateOperationStep(operationId, 'process', {
          status: 'error',
          title: 'Payment failed',
          subtitle: 'Unable to process your payment',
          errorType: randomError,
        });

        failOperation(operationId, `Payment failed: ${randomError.replace('_', ' ')}`);
      }
    } catch (error) {
      failOperation(operationId, 'An unexpected error occurred');
    }
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
          if (key === '⌫') handleDelete();
          else if (key === '✓') handleSubmit();
        } else {
          handleNumberPress(key);
        }
      }}
      onLongPress={() => {
        if (key === '⌫') {
          handleClear();
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
        <View style={styles.dropdownContainer}>
          <DropdownPill />
        </View>
        <View style={styles.content}>
          <View style={styles.displayContainer}>
            <ThemedView
              style={[
                styles.display,
                { backgroundColor: cardBackgroundColor, borderColor: inputBorderColor },
              ]}
            >
              <ThemedText style={[styles.displayText, { color: primaryTextColor }]}>
                {display ? formatCurrency(display) : `0 ${getCurrentCurrencySymbol()}`}
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
                <View style={styles.emptySpace} />
                {renderKey('0')}
                <View style={styles.emptySpace} />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: buttonSecondaryColor }]}
                onPress={handleDelete}
                onLongPress={handleClear}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color={buttonSecondaryTextColor} style={styles.buttonIcon} />
                <ThemedText style={[styles.buttonText, { color: buttonSecondaryTextColor }]}>
                  Delete
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chargeButton, { backgroundColor: buttonPrimaryColor }]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <Send size={20} color={buttonPrimaryTextColor} style={styles.buttonIcon} />
                <ThemedText style={[styles.buttonText, { color: buttonPrimaryTextColor }]}>
                  Charge
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
  dropdownContainer: {
    alignItems: 'center',
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
    margin: 20,
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
    margin: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  deleteButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  chargeButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptySpace: {
    width: 95,
    height: 95,
  },
});
