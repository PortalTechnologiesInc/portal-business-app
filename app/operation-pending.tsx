import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { X, CreditCard, TicketCheck, DollarSign, Loader2 } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { PaymentStatusProgress } from '@/components/ActivityDetail/PaymentStatusProgress';
import { useOperation, OperationType } from '@/context/OperationContext';

export default function OperationPendingScreen() {
  const params = useLocalSearchParams();
  const operationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentOperation, cancelOperation, clearOperation, navigateBack, navigateToResult } =
    useOperation();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const borderColor = useThemeColor({}, 'borderPrimary');

  // Check if we have the right operation
  const operation = currentOperation?.id === operationId ? currentOperation : null;

  // Navigate to result when operation completes
  useEffect(() => {
    if (operation && (operation.status === 'success' || operation.status === 'error')) {
      // Small delay to show final state before navigating
      const timer = setTimeout(() => {
        navigateToResult(operation.id);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [operation?.status, operation?.id, navigateToResult]);

  // Handle back navigation with confirmation if operation is active
  const handleBack = () => {
    if (operation && operation.status === 'pending') {
      Alert.alert('Cancel Operation', 'Are you sure you want to cancel this operation?', [
        {
          text: 'Continue',
          style: 'cancel',
        },
        {
          text: 'Cancel Operation',
          style: 'destructive',
          onPress: () => {
            // Navigate back first, then cancel operation
            router.back();
            setTimeout(() => {
              cancelOperation(operation.id);
            }, 100);
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  // Get operation-specific content
  const getOperationContent = (type: OperationType) => {
    switch (type) {
      case 'charge':
        return {
          title: 'Processing Payment',
          subtitle: 'Please wait while we process your payment...',
          IconComponent: CreditCard,
          iconColor: primaryTextColor,
        };
      case 'verify_ticket':
        return {
          title: 'Verifying Ticket',
          subtitle: 'Please wait while we verify your ticket...',
          IconComponent: TicketCheck,
          iconColor: primaryTextColor,
        };
      case 'sell_ticket':
        return {
          title: 'Selling Ticket',
          subtitle: 'Please wait while we process your ticket sale...',
          IconComponent: DollarSign,
          iconColor: primaryTextColor,
        };
      default:
        return {
          title: 'Processing',
          subtitle: 'Please wait...',
          IconComponent: Loader2,
          iconColor: primaryTextColor,
        };
    }
  };

  // Show error if no operation found
  if (!operation) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.errorCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
              <ThemedText style={[styles.errorTitle, { color: primaryTextColor }]}>
                Operation Not Found
              </ThemedText>
              <ThemedText style={[styles.errorSubtitle, { color: secondaryTextColor }]}>
                The requested operation could not be found.
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const content = getOperationContent(operation.type);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
          </TouchableOpacity>

          <ThemedText style={[styles.headerTitle, { color: primaryTextColor }]}>
            {content.title}
          </ThemedText>

          {operation.status === 'pending' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleBack} activeOpacity={0.7}>
              <X size={24} color={secondaryTextColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Operation icon and description */}
          <View
            style={[styles.operationCard, { backgroundColor: cardBackgroundColor, borderColor }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: cardBackgroundColor }]}>
              <content.IconComponent size={48} color={content.iconColor} />
            </View>

            <ThemedText style={[styles.operationTitle, { color: primaryTextColor }]}>
              {content.title}
            </ThemedText>

            <ThemedText style={[styles.operationSubtitle, { color: secondaryTextColor }]}>
              {content.subtitle}
            </ThemedText>

            {/* Operation details */}
            {operation.data && (
              <View style={styles.detailsContainer}>
                {operation.type === 'charge' && (
                  <ThemedText style={[styles.detailText, { color: primaryTextColor }]}>
                    Amount: {operation.data.amount} {operation.data.currency}
                  </ThemedText>
                )}

                {(operation.type === 'verify_ticket' || operation.type === 'sell_ticket') && (
                  <ThemedText style={[styles.detailText, { color: primaryTextColor }]}>
                    {operation.data.description || `Ticket: ${operation.data.ticketId}`}
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          {/* Progress steps */}
          {operation.steps && operation.steps.length > 0 && (
            <View
              style={[styles.progressCard, { backgroundColor: cardBackgroundColor, borderColor }]}
            >
              <PaymentStatusProgress
                steps={operation.steps}
                onRetry={
                  operation.status === 'error'
                    ? () => {
                        // Handle retry logic here
                        console.log('Retry operation:', operation.id);
                      }
                    : undefined
                }
              />
            </View>
          )}

          {/* Cancel button for active operations */}
          {operation.status === 'pending' && (
            <TouchableOpacity
              style={[
                styles.cancelActionButton,
                { backgroundColor: buttonSecondaryColor, borderColor },
              ]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.cancelButtonText, { color: buttonSecondaryTextColor }]}>
                Cancel Operation
              </ThemedText>
            </TouchableOpacity>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  operationCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  operationTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  operationSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  detailsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  cancelActionButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 'auto',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
});
