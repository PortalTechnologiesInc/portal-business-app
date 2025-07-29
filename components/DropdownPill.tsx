import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  ChevronDown,
  X,
  Star,
  Tag as TagIcon,
  Home,
  User,
  Settings,
  Heart,
  ShoppingCart,
  CreditCard,
  Gift,
  Coffee,
  Utensils,
  Car,
  Bike,
  Footprints,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Camera,
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type Tag } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalEvents } from '@/utils';
import { useNostrService } from '@/context/NostrServiceContext';

// Function to get icon component by name (matching the one from portal-tags.tsx)
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: any } = {
    tag: TagIcon,
    home: Home,
    user: User,
    settings: Settings,
    star: Star,
    heart: Heart,
    'shopping-cart': ShoppingCart,
    'credit-card': CreditCard,
    gift: Gift,
    coffee: Coffee,
    food: Utensils,
    car: Car,
    bike: Bike,
    footprints: Footprints,
    phone: Phone,
    mail: Mail,
    calendar: Calendar,
    clock: Clock,
    'map-pin': MapPin,
    camera: Camera,
  };
  return iconMap[iconName] || TagIcon;
};

interface DropdownPillProps {
  selectedItem?: Tag;
  onItemSelect?: (item: Tag) => void;
}

export default React.memo(function DropdownPill({ selectedItem, onItemSelect }: DropdownPillProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteTagId, setFavoriteTagId] = useState<string | null>(null);
  const [internalSelectedItem, setInternalSelectedItem] = useState<Tag | null>(null);
  const [persistedSelectedTagId, setPersistedSelectedTagId] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const previousActiveTokenRef = useRef<string | null>(null);

  // Get NostrService context for active token management
  const { setActiveToken } = useNostrService();

  // Database setup with error handling
  let sqliteContext = null;
  let DB = null;

  try {
    sqliteContext = useSQLiteContext();
    DB = new DatabaseService(sqliteContext);
  } catch (error) {
    console.log('SQLite context not available yet, tag loading will be delayed');
  }

  // Load favorite tag and selected tag from AsyncStorage
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [favoriteId, selectedId] = await Promise.all([
          AsyncStorage.getItem('favorite_tag_id'),
          AsyncStorage.getItem('selected_tag_id'),
        ]);

        setFavoriteTagId(favoriteId);

        // Clear persisted selection on app start so favorite becomes default
        // Session selections will be persisted via the handleItemSelect function
        await AsyncStorage.removeItem('selected_tag_id');
        setPersistedSelectedTagId(null);

        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Error loading stored tag data:', error);
        setInitialDataLoaded(true);
      }
    };

    loadStoredData();
  }, []);

  // Listen for tag selection changes from other DropdownPill instances
  useEffect(() => {
    const handleTagSelectionChange = (data: { tagId: string }) => {
      setPersistedSelectedTagId(data.tagId);

      // Also update the active token for the newly selected tag
      const tag = tags.find(t => String(t.id) === data.tagId);
      if (tag) {
        setActiveToken(tag.token);
      }
    };

    const handleFavoriteTagChange = (data: { tagId: string | null }) => {
      setFavoriteTagId(data.tagId);
    };

    globalEvents.on('tagSelectionChanged', handleTagSelectionChange);
    globalEvents.on('favoriteTagChanged', handleFavoriteTagChange);

    return () => {
      globalEvents.off('tagSelectionChanged', handleTagSelectionChange);
      globalEvents.off('favoriteTagChanged', handleFavoriteTagChange);
    };
  }, [tags, setActiveToken]);

  // Fetch tags from database
  useEffect(() => {
    const fetchTags = async () => {
      if (!DB) {
        setIsLoading(false);
        return;
      }

      try {
        const fetchedTags = await DB.getTags();
        setTags(fetchedTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setTags([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [DB]);

  // Use simple priority: persisted selection (if exists) > favorite tag > fallbacks
  const currentItem = useMemo(() => {
    // Always respect controlled selectedItem prop first
    if (selectedItem) {
      return selectedItem;
    }

    // If user has made a selection this session, prioritize it
    if (persistedSelectedTagId) {
      return tags.find(tag => String(tag.id) === persistedSelectedTagId) || null;
    }

    // Otherwise, default to favorite tag (app start behavior)
    return (
      (favoriteTagId ? tags.find(tag => String(tag.id) === favoriteTagId) : null) ||
      internalSelectedItem ||
      (tags.length > 0 ? tags[0] : null)
    );
  }, [selectedItem, persistedSelectedTagId, favoriteTagId, internalSelectedItem, tags]);

  // Set the active token whenever the current item changes
  useEffect(() => {
    const newActiveToken = currentItem ? currentItem.token : null;

    // Only call setActiveToken if the token actually changed
    if (previousActiveTokenRef.current !== newActiveToken) {
      console.log(
        `🎯 DropdownPill: Setting active token to: "${newActiveToken}" (type: ${typeof newActiveToken})`
      );
      previousActiveTokenRef.current = newActiveToken;
      setActiveToken(newActiveToken);
    }
  }, [currentItem, setActiveToken]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'inputBorder');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const modalBackgroundColor = useThemeColor({}, 'background');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  const handleItemSelect = async (item: Tag) => {
    setIsModalVisible(false);
    setInternalSelectedItem(item);

    // Persist the selection across tabs
    try {
      await AsyncStorage.setItem('selected_tag_id', String(item.id));
      setPersistedSelectedTagId(String(item.id));

      // Set this as the active token for key handshake callbacks
      setActiveToken(item.token);

      // Emit event to sync with other DropdownPill instances
      globalEvents.emit('tagSelectionChanged', { tagId: String(item.id) });
    } catch (error) {
      console.error('Error persisting selected tag:', error);
    }

    onItemSelect?.(item);
  };

  const handleStarPress = async (item: Tag, event: any) => {
    event.stopPropagation();
    try {
      const isFavorite = String(item.id) === favoriteTagId;
      const newFavoriteId = isFavorite ? null : item.id;

      if (newFavoriteId) {
        await AsyncStorage.setItem('favorite_tag_id', String(newFavoriteId));
        setFavoriteTagId(String(newFavoriteId));
        globalEvents.emit('favoriteTagChanged', { tagId: String(newFavoriteId) });
      } else {
        await AsyncStorage.removeItem('favorite_tag_id');
        setFavoriteTagId(null);
        globalEvents.emit('favoriteTagChanged', { tagId: null });
      }
    } catch (error) {
      console.error('Error setting favorite tag:', error);
    }
  };

  const renderDropdownItem = ({ item }: { item: Tag }) => {
    const isSelected = item.id === currentItem?.id;
    const isFavorite = String(item.id) === favoriteTagId;
    const IconComponent = getIconComponent(item.icon);

    return (
      <TouchableOpacity
        style={[
          styles.dropdownItem,
          { backgroundColor: isSelected ? buttonPrimaryColor : backgroundColor },
        ]}
        onPress={() => handleItemSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownItemContent}>
          <IconComponent
            size={16}
            color={isSelected ? buttonPrimaryTextColor : primaryTextColor}
            style={styles.dropdownItemIcon}
          />
          <ThemedText
            style={[
              styles.dropdownItemLabel,
              { color: isSelected ? buttonPrimaryTextColor : primaryTextColor },
            ]}
          >
            {item.token}
          </ThemedText>
        </View>
        <View style={styles.dropdownItemActions}>
          {isSelected && (
            <ThemedText style={[styles.selectedIndicator, { color: buttonPrimaryTextColor }]}>
              ✓
            </ThemedText>
          )}
          <TouchableOpacity
            onPress={event => handleStarPress(item, event)}
            style={styles.starButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Star size={20} color="white" fill={isFavorite ? 'white' : 'transparent'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading || !initialDataLoaded) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor, borderColor }]}
        activeOpacity={0.7}
        disabled={true}
      >
        <View style={styles.content}>
          <ThemedText style={[styles.label, { color: primaryTextColor }]}>Loading...</ThemedText>
        </View>
        <ChevronDown size={20} color={secondaryTextColor} />
      </TouchableOpacity>
    );
  }

  if (!currentItem) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor, borderColor }]}
        activeOpacity={0.7}
        disabled={true}
      >
        <View style={styles.content}>
          <ThemedText style={[styles.label, { color: primaryTextColor }]}>
            No tags available
          </ThemedText>
        </View>
        <ChevronDown size={20} color={secondaryTextColor} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor, borderColor }]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {React.createElement(getIconComponent(currentItem.icon), {
            size: 16,
            color: primaryTextColor,
            style: styles.icon,
          })}
          <ThemedText style={[styles.label, { color: primaryTextColor }]}>
            {currentItem.token}
          </ThemedText>
        </View>
        <ChevronDown size={20} color={secondaryTextColor} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: modalBackgroundColor }]}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: primaryTextColor }]}>
                Select Tag
              </ThemedText>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={secondaryTextColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={tags}
              renderItem={renderDropdownItem}
              keyExtractor={item => item.id}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    minHeight: 48,
    width: '50%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    height: '80%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  dropdownList: {
    flex: 1,
    paddingBottom: 20,
  },
  // Dropdown item styles
  dropdownItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemIcon: {
    marginRight: 12,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedIndicator: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdownItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
});
