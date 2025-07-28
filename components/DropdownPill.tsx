import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ChevronDown, X, Star, Tag as TagIcon } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type Tag } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DropdownPillProps {
  selectedItem?: Tag;
  onItemSelect?: (item: Tag) => void;
}

export default function DropdownPill({ selectedItem, onItemSelect }: DropdownPillProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteTagId, setFavoriteTagId] = useState<string | null>(null);
  const [internalSelectedItem, setInternalSelectedItem] = useState<Tag | null>(null);

  // Database setup
  const sqliteContext = useSQLiteContext();
  const DB = new DatabaseService(sqliteContext);

  // Load favorite tag from AsyncStorage
  useEffect(() => {
    const loadFavoriteTag = async () => {
      try {
        const favoriteId = await AsyncStorage.getItem('favorite_tag_id');
        setFavoriteTagId(favoriteId);
      } catch (error) {
        console.error('Error loading favorite tag:', error);
      }
    };

    loadFavoriteTag();
  }, []);

  // Fetch tags from database
  useEffect(() => {
    const fetchTags = async () => {
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

  // Use selected item, then internal selected item, then favorite tag, then first item
  const currentItem =
    selectedItem ||
    internalSelectedItem ||
    (favoriteTagId ? tags.find(tag => String(tag.id) === favoriteTagId) : null) ||
    (tags.length > 0 ? tags[0] : null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'inputBorder');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const modalBackgroundColor = useThemeColor({}, 'background');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  const handleItemSelect = (item: Tag) => {
    setIsModalVisible(false);
    setInternalSelectedItem(item);
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
      } else {
        await AsyncStorage.removeItem('favorite_tag_id');
        setFavoriteTagId(null);
      }
    } catch (error) {
      console.error('Error setting favorite tag:', error);
    }
  };

  const renderDropdownItem = ({ item }: { item: Tag }) => {
    const isSelected = item.id === currentItem?.id;
    const isFavorite = String(item.id) === favoriteTagId;

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
          <TagIcon
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
            {item.description || item.token}
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

  if (isLoading) {
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
          <TagIcon size={16} color={primaryTextColor} style={styles.icon} />
          <ThemedText style={[styles.label, { color: primaryTextColor }]}>
            {currentItem.description || currentItem.token}
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
}

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
