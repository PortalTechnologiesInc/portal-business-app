import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCurrency } from '@/context/CurrencyContext';
import { useOperation, createChargeOperation } from '@/context/OperationContext';
import { Send, ArrowLeft } from 'lucide-react-native';
import DropdownPill from '@/components/DropdownPill';
import { useNostrService } from '@/context/NostrServiceContext';
import { globalEvents } from '@/utils';
import { Currency } from 'portal-business-app-lib';
import uuid from 'react-native-uuid';

export default function Home() {
  const [display, setDisplay] = useState('');
  const currentOperationRef = useRef<string | null>(null);
  const { getCurrentCurrencySymbol } = useCurrency();
  const {
    startOperation,
    addOperationStep,
    updateOperationStep,
    navigateToPending,
    completeOperation,
    failOperation,
  } = useOperation();

  const {
    setKeyHandshakeCallbackWithTimeout,
    activeToken,
    clearKeyHandshakeCallback,
    requestSinglePayment,
    lookupInvoice,
    makeInvoice,
  } = useNostrService();

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

    console.log(`🚀 CHARGE BUTTON PRESSED:`);
    console.log(`  - Display value: "${display}"`);
    console.log(`  - Numeric value: ${numericValue}`);
    console.log(`  - Currency: ${getCurrentCurrencySymbol()}`);

    // Validate amount
    if (numericValue <= 0) {
      console.log('❌ Invalid amount, aborting charge process');
      // Could show an alert here
      console.log('Invalid amount');
      return;
    }

    console.log(`✅ Amount validation passed, proceeding with charge...`);

    // Clear display
    setDisplay('');

    // Create operation data
    const operationData = createChargeOperation(numericValue, getCurrentCurrencySymbol());

    // Start the operation
    const operationId = startOperation('charge', operationData);
    currentOperationRef.current = operationId;

    console.log(`📋 Operation created with ID: ${operationId}`);
    console.log(`🎯 Current operation ref set to: ${currentOperationRef.current}`);

    // Navigate to pending screen
    navigateToPending(operationId);

    console.log(`🚀 About to call chargeProcess with:`);
    console.log(`  - Operation ID: ${operationId}`);
    console.log(`  - Amount: ${numericValue} sats`);
    console.log(`  - Currency: ${getCurrentCurrencySymbol()}`);

    // Simulate charge process with steps
    chargeProcess(operationId, numericValue, getCurrentCurrencySymbol());
  };

  // charge processing with steps - REAL PAYMENT IMPLEMENTATION (SATS ONLY)
  // This function implements real Lightning Network payments using PortalBusiness:
  // 1. Wait for customer NFC tap/QR scan (key handshake)
  // 2. Use amount directly as satoshis (no currency conversion)
  // 3. Send payment request to customer using requestSinglePayment
  // 4. Monitor payment status using lookupInvoice until settled
  const chargeProcess = async (operationId: string, amount: number, currency: string) => {
    try {
      const invoice = await makeInvoice(BigInt(parseInt(display) * 1000), 'Keypad payment');
      console.log('Invoice created:', invoice);

      // Step 1: Initializing payment
      addOperationStep(operationId, {
        id: 'init',
        status: 'pending',
        title: 'Initializing payment...',
        subtitle: 'Setting up your payment request',
      });

      updateOperationStep(operationId, 'init', {
        status: 'completed',
        title: 'Payment initialized',
        subtitle: 'Ready to receive payment',
      });

      let received = false;

      setKeyHandshakeCallbackWithTimeout(activeToken || '', async (userPubkey: string) => {
        if (received) {
          return;
        }
        received = true;

        // Step 2: Waiting for customer
        addOperationStep(operationId, {
          id: 'waiting',
          status: 'pending',
          title: 'Waiting for customer...',
          subtitle: 'Ask customer to tap their tag or scan QR',
        });

        // const int = setInterval(() => {
        //   lookupInvoice(invoice.invoice, invoice.paymentHash).then(invoice => {
        //     console.log('Invoice status:', invoice);

        //     if (invoice.settledAt) {
        //       console.warn('Invoice settled');
        //       clearInterval(int);
        //       completeOperation(operationId, {
        //         transactionId: invoice.paymentHash || `txn_${Date.now()}`,
        //         amount,
        //         currency: 'SAT',
        //       });
        //     }
        //   });
        // }, 1000);
        // setTimeout(() => {
        //   clearInterval(int);
        // }, 60000);

        const response = await requestSinglePayment(userPubkey, [], {
          amount: BigInt(parseInt(display) * 1000),
          currency: new Currency.Millisats(),
          description: 'Keypad payment',
          authToken: undefined,
          invoice: '',
          currentExchangeRate: undefined,
          expiresAt: BigInt((new Date().getTime() + 1000 * 60 * 60 * 24)),
          subscriptionId: undefined,
          requestId: uuid.v4(),
        }).catch(error => {
          console.log('Error:', error);
        });

        if (response.status.tag === "Approved") {
          console.log('Payment approved');
          completeOperation(operationId, {
            transactionId: invoice.paymentHash || `txn_${Date.now()}`,
            amount,
            currency: 'SAT',
          });
        } else {
          console.log('Payment failed');
          failOperation(operationId, 'Payment failed');
        }

     });

      // Set up the real callback to wait for key handshake
      let paymentCompleted = false;

      console.log(`🚀 Setting up key handshake callback for operation: ${operationId}`);
      console.log(`🎯 Current active token should be set from DropdownPill`);

      // setKeyHandshakeCallback(async (token: string, userPubkey: string) => {
      //   console.log(`🔔 Key handshake callback triggered!`);
      //   console.log(`📱 Received token: "${token}" (type: ${typeof token})`);
      //   console.log(`👤 Received userPubkey: "${userPubkey}" (type: ${typeof userPubkey})`);
      //   console.log(`✅ Payment completed flag: ${paymentCompleted}`);

      //   if (paymentCompleted) {
      //     console.log(`⚠️ Payment already completed, ignoring handshake`);
      //     return; // Prevent duplicate processing
      //   }
      //   paymentCompleted = true;

      //   console.log(`🎯 Key handshake received!`);
      //   console.log(`📱 Token: ${token}`);
      //   console.log(`👤 User PubKey: ${userPubkey}`);
      //   console.log(`💰 Amount: ${amount} sats`);

      //   // Validate required parameters
      //   if (!userPubkey) {
      //     throw new Error('User public key is undefined');
      //   }
      //   if (!token) {
      //     throw new Error('Token is undefined');
      //   }
      //   if (!amount || amount <= 0) {
      //     throw new Error('Amount is invalid');
      //   }

      //   // Convert userPubkey to string if it's a PublicKey object
      //   let userPubkeyString: string;
      //   if (typeof userPubkey === 'string') {
      //     userPubkeyString = userPubkey;
      //   } else {
      //     // Handle PublicKey object or other types
      //     userPubkeyString = String(userPubkey);
      //   }
      //   console.log(`🔄 Converted userPubkey to string: "${userPubkeyString}"`);

      //   try {
      //     // Update waiting step to completed
      //     updateOperationStep(operationId, 'waiting', {
      //       status: 'completed',
      //       title: 'Customer detected',
      //       subtitle: `Processing payment for ${amount} sats`,
      //     });

      //     // Step 3: Processing payment
      //     addOperationStep(operationId, {
      //       id: 'process',
      //       status: 'pending',
      //       title: 'Requesting payment...',
      //       subtitle: `Sending payment request for ${amount} sats`,
      //     });

      //     // Create payment request content
      //     const amountInSats = amount; // Use the amount directly as sats

      //     // Validate payment amount (minimum 1 sat, maximum 100M sats)
      //     if (amountInSats < 1) {
      //       throw new Error('Payment amount too small (minimum 1 satoshi)');
      //     }
      //     if (amountInSats > 100000000) {
      //       throw new Error('Payment amount too large (maximum 100M sats)');
      //     }

      //     const paymentRequest = {
      //       amount: amountInSats,
      //       currency: 'SAT',
      //       description: `Payment request for ${amountInSats} sats`,
      //       memo: `Charge from business via ${token}`,
      //     };

      //     console.log(`💸 Requesting payment: ${amountInSats} sats`);
      //     console.log(`📄 Payment request details:`, paymentRequest);
      //     console.log(`🔍 Debug parameters:`);
      //     console.log(`  - userPubkey: "${userPubkeyString}" (type: ${typeof userPubkeyString})`);
      //     console.log(`  - subkeys: ${JSON.stringify([])} (type: ${typeof []})`);
      //     console.log(
      //       `  - paymentRequest.amount: ${paymentRequest.amount} (type: ${typeof paymentRequest.amount})`
      //     );
      //     console.log(
      //       `  - paymentRequest.currency: "${paymentRequest.currency}" (type: ${typeof paymentRequest.currency})`
      //     );
      //     console.log(
      //       `  - paymentRequest.description: "${paymentRequest.description}" (type: ${typeof paymentRequest.description})`
      //     );
      //     console.log(
      //       `  - paymentRequest.memo: "${paymentRequest.memo}" (type: ${typeof paymentRequest.memo})`
      //     );

      //     // Send payment request to customer using PortalBusiness
      //     let paymentResponse;
      //     try {
      //       console.log(`🚀 Calling requestSinglePayment...`);
      //       paymentResponse = await requestSinglePayment(
      //         userPubkeyString, // main key
      //         [], // subkeys (empty for now)
      //         paymentRequest
      //       );
      //       console.log(`✅ requestSinglePayment completed successfully`);
      //     } catch (requestError) {
      //       console.error(`❌ requestSinglePayment failed:`, requestError);
      //       console.error(`❌ Error details:`, {
      //         message: requestError instanceof Error ? requestError.message : 'Unknown error',
      //         stack: requestError instanceof Error ? requestError.stack : 'No stack trace',
      //         userPubkey: userPubkeyString,
      //         paymentRequest: paymentRequest,
      //       });
      //       throw new Error(
      //         `Payment request failed: ${requestError instanceof Error ? requestError.message : 'Unknown error'}`
      //       );
      //     }

      //     console.log(`📄 Payment response:`, paymentResponse);

      //     // Check if we got an invoice in the response
      //     if (paymentResponse && (paymentResponse.invoice || paymentResponse.payment_request)) {
      //       const invoice = paymentResponse.invoice || paymentResponse.payment_request;

      //       updateOperationStep(operationId, 'process', {
      //         status: 'pending',
      //         title: 'Monitoring payment...',
      //         subtitle: `Invoice: ${invoice.substring(0, 20)}...`,
      //       });

      //       // Use the existing lookupInvoice method to check payment status
      //       console.log(`⏳ Monitoring invoice status: ${invoice}`);

      //       // Poll for payment completion using the library's lookupInvoice method
      //       let attempts = 0;
      //       const maxAttempts = 30; // 60 seconds max

      //       while (attempts < maxAttempts) {
      //         try {
      //           const invoiceStatus = await lookupInvoice(invoice);
      //           console.log(`📊 Invoice status check ${attempts + 1}:`, invoiceStatus);

      //           if (invoiceStatus.settledAt) {
      //             // Payment completed successfully
      //             updateOperationStep(operationId, 'process', {
      //               status: 'success',
      //               title: 'Payment completed',
      //               subtitle: 'Invoice paid successfully',
      //             });

      //             completeOperation(operationId, {
      //               transactionId: invoiceStatus.paymentHash || `txn_${Date.now()}`,
      //               amount,
      //               currency: 'SAT',
      //               status: 'completed',
      //               customerPubkey: userPubkey,
      //               paymentToken: token,
      //               invoice: invoice,
      //               invoiceStatus,
      //             });

      //             console.log(`✅ Payment completed! Hash: ${invoiceStatus.paymentHash}`);
      //             currentOperationRef.current = null;
      //             return; // Exit the callback successfully
      //           }

      //           // Check if invoice is still valid (not expired based on timestamp or status)
      //           // We'll rely on errors from lookupInvoice to handle expiration

      //           // Wait 2 seconds before next check
      //           await new Promise(resolve => setTimeout(resolve, 2000));
      //           attempts++;
      //         } catch (statusError) {
      //           console.warn(`Error checking invoice status: ${statusError}`);
      //           attempts++;
      //           await new Promise(resolve => setTimeout(resolve, 2000));
      //         }
      //       }

      //       // If we reach here, payment timed out
      //       throw new Error('Payment timed out - no payment received within 60 seconds');
      //     } else {
      //       // No invoice in response - handle differently
      //       throw new Error('No invoice received from payment request');
      //     }
      //   } catch (error) {
      //     console.error('Error processing payment:', error);

      //     let errorTitle = 'Payment failed';
      //     let errorSubtitle = 'Unable to process payment request';

      //     if (error instanceof Error) {
      //       if (error.message.includes('amount too small')) {
      //         errorTitle = 'Amount too small';
      //         errorSubtitle = 'Minimum payment is 1 sat';
      //       } else if (error.message.includes('amount too large')) {
      //         errorTitle = 'Amount too large';
      //         errorSubtitle = 'Maximum payment is 100M sats';
      //       } else if (error.message.includes('not initialized')) {
      //         errorTitle = 'Service unavailable';
      //         errorSubtitle = 'Payment service is not ready';
      //       } else if (error.message.includes('timeout')) {
      //         errorTitle = 'Payment timeout';
      //         errorSubtitle = 'Customer did not complete payment';
      //       }
      //     }

      //     updateOperationStep(operationId, 'process', {
      //       status: 'error',
      //       title: errorTitle,
      //       subtitle: errorSubtitle,
      //     });

      //     failOperation(
      //       operationId,
      //       `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      //     );
      //     currentOperationRef.current = null; // Clear operation ref on error
      //   }
      // });

      console.log(`🔊 Now listening for key handshake on selected token...`);
    } catch (error) {
      console.error('Error in charge process:', error.inner);
      failOperation(operationId, 'An unexpected error occurred');
    }
  };

  // Effect to listen for global callback timeout events
  useEffect(() => {
    const handleCallbackTimeout = (data: { reason: string; message: string }) => {
      const operationId = currentOperationRef.current;
      if (operationId) {
        console.log(`⏰ Global callback timeout detected, failing operation: ${operationId}`);

        updateOperationStep(operationId, 'waiting', {
          status: 'error',
          title: 'Payment timeout',
          subtitle: 'No customer interaction detected',
        });

        failOperation(operationId, 'Payment timed out - no customer interaction');
        currentOperationRef.current = null; // Clear the operation ref
      }
    };

    globalEvents.on('callbackTimeout', handleCallbackTimeout);

    return () => {
      globalEvents.off('callbackTimeout', handleCallbackTimeout);
    };
  }, [updateOperationStep, failOperation]);

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
