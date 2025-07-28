import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  TicketCheck,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useOperation, OperationType } from '@/context/OperationContext';

export default function OperationResultScreen() {
  const params = useLocalSearchParams();
  const operationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentOperation, clearOperation, navigateBack } = useOperation();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');
  const statusErrorColor = useThemeColor({}, 'statusError');
  const borderColor = useThemeColor({}, 'borderPrimary');

  // Check if we have the right operation
  const operation = currentOperation?.id === operationId ? currentOperation : null;

  // Auto-clear operation after a delay if successful
  useEffect(() => {
    if (operation && operation.status === 'success') {
      const timer = setTimeout(() => {
        clearOperation();
      }, 30000); // Clear after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [operation?.status, clearOperation]);

  // Handle done action
  const handleDone = () => {
    // Clear operation and navigate back to original screen
    clearOperation();
    router.back();
  };

  // Handle retry action
  const handleRetry = () => {
    if (operation) {
      // Clear current operation and navigate back to trigger retry
      clearOperation();
      router.back();
    }
  };

  // Get operation-specific content
  const getResultContent = (type: OperationType, isSuccess: boolean) => {
    if (isSuccess) {
      switch (type) {
        case 'charge':
          return {
            title: 'Payment Successful',
            subtitle: 'Your payment has been processed successfully.',
            IconComponent: CreditCard,
            color: statusConnectedColor,
          };
        case 'verify_ticket':
          return {
            title: 'Ticket Verified',
            subtitle: 'Your ticket has been successfully verified.',
            IconComponent: TicketCheck,
            color: statusConnectedColor,
          };
        case 'sell_ticket':
          return {
            title: 'Ticket Sold',
            subtitle: 'Your ticket has been successfully sold.',
            IconComponent: DollarSign,
            color: statusConnectedColor,
          };
        default:
          return {
            title: 'Operation Successful',
            subtitle: 'Your operation completed successfully.',
            IconComponent: CheckCircle,
            color: statusConnectedColor,
          };
      }
    } else {
      switch (type) {
        case 'charge':
          return {
            title: 'Payment Failed',
            subtitle: "We couldn't process your payment. Please try again.",
            IconComponent: CreditCard,
            color: statusErrorColor,
          };
        case 'verify_ticket':
          return {
            title: 'Verification Failed',
            subtitle: "We couldn't verify your ticket. Please try again.",
            IconComponent: TicketCheck,
            color: statusErrorColor,
          };
        case 'sell_ticket':
          return {
            title: 'Sale Failed',
            subtitle: "We couldn't sell your ticket. Please try again.",
            IconComponent: DollarSign,
            color: statusErrorColor,
          };
        default:
          return {
            title: 'Operation Failed',
            subtitle: "Your operation couldn't be completed. Please try again.",
            IconComponent: AlertCircle,
            color: statusErrorColor,
          };
      }
    }
  };

  // Show error if no operation found
  if (!operation) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleDone} activeOpacity={0.7}>
              <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View
              style={[styles.operationCard, { backgroundColor: cardBackgroundColor, borderColor }]}
            >
              <ThemedText style={[styles.operationTitle, { color: primaryTextColor }]}>
                Operation Not Found
              </ThemedText>
              <ThemedText style={[styles.operationSubtitle, { color: secondaryTextColor }]}>
                The requested operation result could not be found.
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const isSuccess = operation.status === 'success';
  const content = getResultContent(operation.type, isSuccess);

  // Calculate duration if available
  const duration =
    operation.startTime && operation.endTime
      ? Math.round((operation.endTime.getTime() - operation.startTime.getTime()) / 1000)
      : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleDone} activeOpacity={0.7}>
            <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
          </TouchableOpacity>

          <ThemedText style={[styles.headerTitle, { color: primaryTextColor }]}>Result</ThemedText>

          <View style={styles.headerSpacer} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Result card */}
          <View
            style={[styles.operationCard, { backgroundColor: cardBackgroundColor, borderColor }]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: cardBackgroundColor, borderColor: content.color },
              ]}
            >
              <content.IconComponent size={48} color={content.color} />
            </View>

            <ThemedText style={[styles.operationTitle, { color: content.color }]}>
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

                {duration && (
                  <ThemedText style={[styles.detailText, { color: secondaryTextColor }]}>
                    Duration: {duration}s
                  </ThemedText>
                )}
              </View>
            )}

            {/* Error details */}
            {!isSuccess && operation.error && (
              <View style={styles.errorContainer}>
                <ThemedText style={[styles.errorLabel, { color: secondaryTextColor }]}>
                  Error Details:
                </ThemedText>
                <ThemedText style={[styles.errorText, { color: statusErrorColor }]}>
                  {operation.error}
                </ThemedText>
              </View>
            )}

            {/* Result data */}
            {isSuccess && operation.result && (
              <View style={styles.resultDataContainer}>
                <ThemedText style={[styles.resultDataLabel, { color: secondaryTextColor }]}>
                  Transaction ID:
                </ThemedText>
                <ThemedText style={[styles.resultDataText, { color: primaryTextColor }]}>
                  {operation.result.transactionId ||
                    operation.result.verificationId ||
                    operation.result.saleId ||
                    'N/A'}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: buttonPrimaryColor }]}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.primaryButtonText, { color: buttonPrimaryTextColor }]}>
                Done
              </ThemedText>
            </TouchableOpacity>

            {!isSuccess && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { backgroundColor: buttonSecondaryColor, borderColor },
                ]}
                onPress={handleRetry}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color={buttonSecondaryTextColor} style={styles.buttonIcon} />
                <ThemedText
                  style={[styles.secondaryButtonText, { color: buttonSecondaryTextColor }]}
                >
                  Retry
                </ThemedText>
              </TouchableOpacity>
            )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
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
  errorContainer: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
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
  resultDataContainer: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  resultDataLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultDataText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
