import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Identity } from '../../models/Identity';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Plus, Edit } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type IdentityListProps = {
  onManageIdentity: (identity: Identity) => void;
  onDeleteIdentity: (identity: Identity) => void;
};

export default function IdentityList({ onManageIdentity }: IdentityListProps) {
  const [identities] = useState<Identity[]>([]);

  const router = useRouter();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textPrimary = useThemeColor({}, 'textPrimary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderPrimary = useThemeColor({}, 'borderPrimary');
  const buttonPrimary = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryText = useThemeColor({}, 'buttonPrimaryText');
  const shadowColor = useThemeColor({}, 'shadowColor');

  const renderItem = ({ item }: { item: Identity }) => (
    <TouchableOpacity style={[styles.listItem, { borderBottomColor: borderPrimary }]}>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ color: textPrimary }}>{item.name}</ThemedText>
        <ThemedText style={{ color: textSecondary, fontSize: 12 }}>{item.publicKey}</ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonPrimary }]}
          onPress={() => onManageIdentity(item)}
        >
          <ThemedText style={[styles.buttonText, { color: buttonPrimaryText }]}>Edit</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { backgroundColor: cardBackground }]}>
          <ThemedText style={[styles.masterKeyDisplay, { color: textSecondary }]}>
            Master Key: ax87DJe9IjdDJi40PoaW55tR...
          </ThemedText>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: buttonPrimary }]}
            onPress={() => router.navigate('/')}
          >
            <ThemedText style={[styles.createButtonText, { color: buttonPrimaryText }]}>
              Create New Identity
            </ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          ListHeaderComponent={<ThemedText type="subtitle">Your subkeys:</ThemedText>}
          data={identities}
          renderItem={renderItem}
          keyExtractor={item => item.publicKey}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: buttonPrimary,
              shadowColor: shadowColor,
            },
          ]}
          onPress={() => router.navigate('/')}
        >
          <ThemedText style={[styles.fabIcon, { color: buttonPrimaryText }]}>+</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled by theme
  },
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    padding: 50,
    // backgroundColor handled by theme
    borderBottomWidth: 1,
    // borderBottomColor handled by theme (will need to be applied inline)
    alignItems: 'center', // Center content horizontally
  },
  masterKeyDisplay: {
    marginTop: 10,
    fontSize: 16,
    // color handled by theme
  },
  createButton: {
    marginTop: 20,
    // backgroundColor handled by theme
    padding: 10,
    borderRadius: 5,
  },
  createButtonText: {
    textAlign: 'center',
    // color handled by theme
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    // backgroundColor handled by theme
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // For Android shadow
    // shadowColor handled by theme
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  fabIcon: {
    fontSize: 24,
    // color handled by theme
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
    // borderBottomColor handled by theme
  },
  buttonsContainer: {
    flexDirection: 'row',
  },
  button: {
    // backgroundColor handled by theme
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: 'bold',
    // color handled by theme
  },
});
