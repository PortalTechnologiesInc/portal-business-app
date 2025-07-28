import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ChevronDown, Table, User, DoorOpen, ChefHat, X } from 'lucide-react-native';

interface DropdownItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface DropdownPillProps {
  selectedItem?: DropdownItem;
  onItemSelect?: (item: DropdownItem) => void;
}

const MOCK_ITEMS: DropdownItem[] = [
  {
    id: 'table1',
    label: 'Table 1',
    icon: Table,
  },
  {
    id: 'table2',
    label: 'Table 2',
    icon: Table,
  },
  {
    id: 'cashier',
    label: 'Cashier',
    icon: User,
  },
  {
    id: 'mainDoor',
    label: 'Main Door',
    icon: DoorOpen,
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: ChefHat,
  },
];

export default function DropdownPill({ selectedItem, onItemSelect }: DropdownPillProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Use first item as default if no selection provided
  const currentItem = selectedItem || MOCK_ITEMS[0];
  const IconComponent = currentItem.icon;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'inputBorder');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const modalBackgroundColor = useThemeColor({}, 'background');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  const handleItemSelect = (item: DropdownItem) => {
    setIsModalVisible(false);
    onItemSelect?.(item);
  };

  const renderDropdownItem = ({ item }: { item: DropdownItem }) => {
    const ItemIcon = item.icon;
    const isSelected = item.id === currentItem.id;

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
          <ItemIcon
            size={20}
            color={isSelected ? buttonPrimaryTextColor : primaryTextColor}
            style={styles.dropdownItemIcon}
          />
          <ThemedText
            style={[
              styles.dropdownItemLabel,
              { color: isSelected ? buttonPrimaryTextColor : primaryTextColor },
            ]}
          >
            {item.label}
          </ThemedText>
        </View>
        {isSelected && (
          <ThemedText style={[styles.selectedIndicator, { color: buttonPrimaryTextColor }]}>
            ✓
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor, borderColor }]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <IconComponent size={20} color={primaryTextColor} style={styles.icon} />
          <ThemedText style={[styles.label, { color: primaryTextColor }]}>
            {currentItem.label}
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
                Select Location
              </ThemedText>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={secondaryTextColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MOCK_ITEMS}
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
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
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
});
