import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  Tag as TagIcon,
  MapPin,
  Calendar,
  Ticket,
  Trash2,
  TicketCheck,
  BanknoteArrowUp,
} from 'lucide-react-native';
import type { Ticket as DatabaseTicket } from '@/services/database';
import type { Ticket as OriginalTicket } from '@/utils/types';

// Union type to handle both database and original tickets
type TicketData = DatabaseTicket | OriginalTicket;

interface TicketCardProps {
  ticket: TicketData;
  onDelete?: (id: string) => void;
  onVerify?: (id: string) => void;
  onSell?: (id: string) => void;
  onPress?: () => void;
}

export default function TicketCard({
  ticket,
  onDelete,
  onVerify,
  onSell,
  onPress,
}: TicketCardProps) {
  // Debug: Log the ticket data

  // Theme colors
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const iconBackgroundColor = useThemeColor({}, 'surfaceSecondary');
  const iconColor = useThemeColor({}, 'icon');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'borderPrimary');

  // Check if this is a database ticket or original ticket
  const isDatabaseTicket = 'mint_url' in ticket && 'unit' in ticket && 'price' in ticket;

  // Extract data based on ticket type
  const title = isDatabaseTicket ? ticket.mint_url : (ticket as OriginalTicket).title;

  const description = isDatabaseTicket
    ? `Unit: ${(ticket as DatabaseTicket).unit}`
    : (ticket as OriginalTicket).description;

  const location = isDatabaseTicket ? undefined : (ticket as OriginalTicket).location;

  const date = isDatabaseTicket ? undefined : (ticket as OriginalTicket).date;

  const price = isDatabaseTicket
    ? `${(ticket as DatabaseTicket).price} ${(ticket as DatabaseTicket).currency}`
    : undefined;

  const balance = isDatabaseTicket ? undefined : (ticket as OriginalTicket).balance;

  // Format the title for better display - use unit as main text
  const displayTitle = isDatabaseTicket ? (ticket as DatabaseTicket).unit : title;

  // Format the description for better display - use mint URL as description
  const displayDescription = isDatabaseTicket
    ? (ticket as DatabaseTicket).mint_url.length > 50
      ? (ticket as DatabaseTicket).mint_url.substring(0, 50) + '...'
      : (ticket as DatabaseTicket).mint_url
    : description;

  // Format creation date for database tickets
  const creationDate = isDatabaseTicket
    ? new Date((ticket as DatabaseTicket).created_at * 1000).toLocaleDateString()
    : undefined;

  const handleDelete = () => {
    onDelete?.(ticket.id);
  };

  const handleVerify = () => {
    onVerify?.(ticket.id);
  };

  const handleSell = () => {
    onSell?.(ticket.id);
  };

  const handlePress = () => {
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardBackgroundColor, borderColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.ticketIcon, { backgroundColor: iconBackgroundColor }]}>
          <Ticket size={20} color={iconColor} />
        </View>
        {creationDate && (
          <View style={styles.createdHeaderContainer}>
            <Calendar size={14} color={secondaryTextColor} />
            <ThemedText
              style={[styles.createdHeaderText, { color: secondaryTextColor }]}
              numberOfLines={1}
            >
              Created: {creationDate}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.mainContent}>
          <View style={styles.upperSection}>
            <ThemedText style={[styles.title, { color: primaryTextColor }]} numberOfLines={2}>
              {displayTitle}
            </ThemedText>

            {displayDescription && (
              <ThemedText
                style={[styles.subtitle, { color: secondaryTextColor }]}
                numberOfLines={2}
              >
                {displayDescription}
              </ThemedText>
            )}
          </View>

          <View style={styles.metadata}>
            {location && (
              <View style={styles.metadataItem}>
                <MapPin size={14} color={secondaryTextColor} />
                <ThemedText
                  style={[styles.metadataText, { color: secondaryTextColor }]}
                  numberOfLines={1}
                >
                  {location}
                </ThemedText>
              </View>
            )}

            {date && (
              <View style={styles.metadataItem}>
                <Calendar size={14} color={secondaryTextColor} />
                <ThemedText
                  style={[styles.metadataText, { color: secondaryTextColor }]}
                  numberOfLines={1}
                >
                  {date}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      {price && (
        <View style={styles.priceContainer}>
          <ThemedText style={[styles.priceText, { color: primaryTextColor }]}>{price}</ThemedText>
        </View>
      )}

      <View style={styles.actionButtons}>
        {onDelete && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={22} color={secondaryTextColor} />
          </TouchableOpacity>
        )}

        {onVerify && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleVerify}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <TicketCheck size={24} color={secondaryTextColor} />
          </TouchableOpacity>
        )}

        {onSell && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSell}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BanknoteArrowUp size={24} color={secondaryTextColor} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    minHeight: 160,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'center',
  },
  mainContent: {
    flex: 1,
    marginTop: 0,
    justifyContent: 'center',
  },
  upperSection: {
    marginBottom: 24,
    marginTop: 24,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    lineHeight: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  metadata: {
    gap: 6,
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    flex: 1,
    opacity: 0.7,
  },
  valueContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  balance: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  deleteIcon: {
    padding: 4,
    marginLeft: 8,
  },
  ticketIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  createdHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createdHeaderText: {
    fontSize: 12,
    opacity: 0.8,
  },
  priceContainer: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: 40,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
