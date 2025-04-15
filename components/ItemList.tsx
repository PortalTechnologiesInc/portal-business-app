import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

enum ItemType {
  Auth,
  Pay,
}
type Item = {
  type: ItemType;
  name: string;
  detail: string;
  date: Date;
};

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([
    { type: ItemType.Auth, name: 'Instagram', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    { type: ItemType.Pay, name: 'Musicfly', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    { type: ItemType.Pay, name: 'JustEat', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    { type: ItemType.Auth, name: 'Facebook', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    { type: ItemType.Auth, name: 'INPS', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    // ... more items
  ]);
  const [filter, setFilter] = useState('');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase())
  );

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIconContainer}>
        {item.type === ItemType.Auth ? (
          <Feather name="unlock" size={24} color="white" />
        ) : (
          <FontAwesome5 name="bitcoin" size={24} color="white" />
        )}
      </View>
      <View style={styles.itemTextContainer}>
        <ThemedText type="title">{item.name}</ThemedText>
        <ThemedText>{item.detail}</ThemedText>
      </View>
      <Text style={styles.date}>{item.date.toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.filterInput}
        placeholder="Filter items"
        value={filter}
        onChangeText={setFilter}
      />
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    width: '100%', // Make items take up full width
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#999',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemIconContainer: {
    marginRight: 15
  },
  date: {
    color: '#999',
  },
  filterInput: {
    color: "#fff",
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    margin: 10,
  },
});

export default ItemList;
