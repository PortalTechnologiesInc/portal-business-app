import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Identity } from '../../models/Identity';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { getMockedIdentities } from '../../mocks/Identities';
import { Colors } from '@/constants/Colors';
import { Plus, Edit } from 'lucide-react-native';

export type IdentityListProps = {
  onManageIdentity: (identity: Identity) => void;
  onDeleteIdentity: (identity: Identity) => void;
};

export default function IdentityList({ onManageIdentity, onDeleteIdentity }: IdentityListProps) {
  const [identities, setIdentities] = useState<Identity[]>([]);

  const router = useRouter();

  useEffect(() => {
    setIdentities(getMockedIdentities());
  }, []);
  const renderItem = ({ item }: { item: Identity }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => onManageIdentity(item)}>
      <View>
        <ThemedText
          type="defaultSemiBold"
          lightColor={Colors.almostWhite}
          darkColor={Colors.almostWhite}
        >
          {item.name}
        </ThemedText>
        <ThemedText lightColor={Colors.dirtyWhite} darkColor={Colors.dirtyWhite}>
          {item.publicKey}
        </ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <Edit
          size={16}
          color={Colors.almostWhite}
          onPress={() => onManageIdentity(item)}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" darkColor={Colors.almostWhite} lightColor={Colors.almostWhite}>
            Master Key
          </ThemedText>
          <ThemedText
            type="subtitle"
            style={styles.masterKeyDisplay}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            ax87DJe9IjdDJi40PoaW55tR...
          </ThemedText>
        </ThemedView>
        <TouchableOpacity style={styles.fab} onPress={() => router.navigate('/')}>
          <Plus size={24} color={Colors.darkerGray} />
        </TouchableOpacity>

        <FlatList
          ListHeaderComponent={<ThemedText type="subtitle">Your subkeys:</ThemedText>}
          data={identities}
          renderItem={renderItem}
          keyExtractor={item => item.publicKey}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.darkerGray, // Example background color
  },
  header: {
    padding: 50,
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#333', // Example border color
    alignItems: 'center', // Center content horizontally
  },
  masterKeyDisplay: {
    marginTop: 10,
    fontSize: 16,
    color: 'grey', // Example color
  },
  createButton: {
    marginTop: 20,
    backgroundColor: 'white', // Example button color
    padding: 10,
    borderRadius: 5,
  },
  createButtonText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.almostWhite, // Customize color
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // For Android shadow
    shadowColor: Colors.darkerGray, // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },

  fabIcon: {
    fontSize: 24,
    color: Colors.darkGray,
  },
  list: {
    flex: 1,
    marginBottom: 80, // Add margin to avoid overlap with FAB
  },
  listContent: {
    width: '100%', // Make items take up full width
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 45,
    marginBottom: 80, // Add margin to avoid overlap with FAB
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, // Adjust vertical padding
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGray, // Use a lighter border color
  },
  buttonsContainer: {
    flexDirection: 'row',
  },
});
