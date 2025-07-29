import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  View,
  ToastAndroid,
  Modal,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  X,
  Plus,
  Tag as TagIcon,
  Home,
  User,
  Settings,
  Star,
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
  WifiOff,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { DatabaseService, Tag, toUnixSeconds } from '@/services/database';
import { useSQLiteContext } from 'expo-sqlite';
import { useNostrService } from '@/context/NostrServiceContext';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';
import NfcManager, { Ndef } from 'react-native-nfc-manager';
import { NfcTech } from 'react-native-nfc-manager';
import NFCScanUI from './nfc/NFCScanUI';

// Use the same relays that the business app listens on
const DEFAULT_RELAYS = [
  'wss://relay.getportal.cc',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://offchain.pub',
];

export default function PortalTagsManagementScreen() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagToken, setNewTagToken] = useState<string>('');
  const [newTagDescription, setNewTagDescription] = useState<string>('');
  const [newTagIcon, setNewTagIcon] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isNfcEnabled, setIsNfcEnabled] = useState<boolean | null>(null);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [db, setDb] = useState<DatabaseService | null>(null);

  // Available icons for selection
  const availableIcons = [
    'tag',
    'home',
    'user',
    'settings',
    'star',
    'heart',
    'shopping-cart',
    'credit-card',
    'gift',
    'coffee',
    'food',
    'car',
    'bike',
    'footprints',
    'phone',
    'mail',
    'calendar',
    'clock',
    'map-pin',
    'camera',
  ];

  // Function to get icon component by name
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

  const handleIconSelect = (iconName: string) => {
    setNewTagIcon(iconName);
    setIsIconModalVisible(false);
  };

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const inputBorderColor = useThemeColor({}, 'inputBorder');
  const inputPlaceholderColor = useThemeColor({}, 'inputPlaceholder');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  const nostrService = useNostrService();

  // Get database initialization status
  const dbStatus = useDatabaseStatus();

  // Only try to access SQLite context if the database is initialized
  let sqliteContext = null;
  try {
    // This will throw an error if SQLiteProvider is not available
    if (dbStatus.isDbInitialized && dbStatus.shouldInitDb) {
      sqliteContext = useSQLiteContext();
    }
  } catch (error) {
    // SQLiteContext is not available, which is expected sometimes
    console.log('SQLite context not available yet, tags loading will be delayed');
  }

  // NFC Status Checking
  const checkNFCStatus = async (): Promise<boolean> => {
    // Return true in development mode for testing
    if (__DEV__) {
      console.log('Development mode: Portal Tags NFC check returning true');
      return true;
    }

    try {
      const isStarted = await NfcManager.isSupported();
      if (!isStarted) {
        return false;
      }
      const isEnabled = await NfcManager.isEnabled();
      return isEnabled;
    } catch {
      return false;
    }
  };

  const writeNdef = async (url: string) => {
    setIsWriting(true);
    let result = false;

    try {
      // STEP 1
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);

      if (bytes) {
        await NfcManager.ndefHandler // STEP 2
          .writeNdefMessage(bytes); // STEP 3
        result = true;
      }
    } catch (ex) {
      console.warn(ex);
    } finally {
      // STEP 4
      NfcManager.cancelTechnologyRequest();
    }

    setIsWriting(false);
    return result;
  };

  // Initialize DB safely when the SQLite context becomes available
  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      // Skip if database is not ready or SQLite context is not available
      if (!dbStatus.isDbInitialized || !sqliteContext) {
        if (isMounted) {
          setDb(null);
          if (!dbStatus.isDbInitialized) {
            console.log('Database not yet initialized, skipping SQLite context access');
          }
        }
        return;
      }

      try {
        if (isMounted && sqliteContext) {
          console.log('SQLite context obtained, initializing database service');
          const newDb = new DatabaseService(sqliteContext);
          setDb(newDb);
          console.log('Database service successfully initialized');
        }
      } catch (error) {
        if (isMounted) {
          setDb(null);
          console.error('Error initializing database service:', error);
        }
      }
    };

    initDb();

    return () => {
      isMounted = false;
    };
  }, [dbStatus.isDbInitialized, sqliteContext]);

  useEffect(() => {
    if (!db) {
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      const initializeScreen = async () => {
        // Check NFC status first
        const nfcEnabled = await checkNFCStatus();
        setIsNfcEnabled(nfcEnabled);

        if (nfcEnabled) {
          NfcManager.start();
        }

        // Load tags
        let tags = await db.getTags();
        setTags(tags);
      };
      initializeScreen();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const handleClearInput = () => {
    setNewTagToken('');
    setNewTagDescription('');
    setNewTagIcon('');
  };

  const addNewTag = async () => {
    if (!db) {
      ToastAndroid.showWithGravity(
        'Database not ready. Please wait a moment and try again.',
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
      return;
    }

    if (!newTagToken.trim()) {
      ToastAndroid.showWithGravity(
        'Tag name cannot be empty',
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
      return;
    }

    // Encode the token to handle spaces
    const encodedToken = encodeURIComponent(newTagToken.trim());

    if (tags.map(tag => tag.token).includes(encodedToken)) {
      ToastAndroid.showWithGravity(
        'Tag with this name already exists',
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
      return;
    }

    const newTag = {
      id: '', // The database will assign an ID
      token: encodedToken, // Store encoded token
      description: newTagDescription.trim() || null,
      // Include ALL relays that the business app listens on
      // portal://npub1...?relays=wss%3A%2F%2Frelay.getportal.cc,wss%3A%2F%2Frelay.nostr.band,wss%3A%2F%2Fnos.lol,wss%3A%2F%2Foffchain.pub&token=alekos
      url: `portal://${nostrService.publicKey}?relays=${encodeURIComponent(DEFAULT_RELAYS.join(','))}&token=${encodedToken}`,
      icon: newTagIcon === '' ? 'tag' : newTagIcon,
      created_at: 0,
    };

    console.log('🏷️ Generated Portal URL:', newTag.url);
    console.log('🔗 Relays included:', DEFAULT_RELAYS);
    console.log('🎯 Token:', encodedToken);

    try {
      // Check if NFC is enabled before proceeding
      if (!isNfcEnabled) {
        ToastAndroid.showWithGravity(
          'NFC is not enabled. Please enable NFC to write tags.',
          ToastAndroid.LONG,
          ToastAndroid.CENTER
        );
        return;
      }

      let isWritten = await writeNdef(newTag.url);
      if (!isWritten) {
        return;
      }
      // Add to database
      await db!.addTag(newTag.token, newTag.description, newTag.url, newTagIcon);

      setTags([newTag, ...tags]);

      setNewTagToken('');
      setNewTagDescription('');
      setNewTagIcon('');

      ToastAndroid.showWithGravity(
        'Tag created successfully',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER
      );
    } catch (error) {
      console.error('Error with NFC tag:', error);

      clearNfc();

      ToastAndroid.showWithGravity(
        'Failed to interact with NFC tag. Please try again.',
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
    }
  };
  const clearNfc = async () => {
    // Clean up NFC session on error
    try {
      await NfcManager.cancelTechnologyRequest();
      await NfcManager.unregisterTagEvent();
    } catch (cleanupError) {
      console.error('Error cleaning up NFC session:', cleanupError);
    }
  };

  const deleteTag = async (tagToken: string) => {
    if (!db) {
      ToastAndroid.showWithGravity(
        'Database not ready. Please wait a moment and try again.',
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
      return;
    }

    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the tag "${decodeURIComponent(tagToken)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the tag being deleted to get its ID
              const tagToDelete = tags.find(tag => tag.token === tagToken);

              // Delete from database
              await db!.deleteTag(tagToken);

              // Check if this was the favorite tag and clean up AsyncStorage
              if (tagToDelete) {
                try {
                  const favoriteTagId = await AsyncStorage.getItem('favorite_tag_id');
                  if (favoriteTagId && String(tagToDelete.id) === favoriteTagId) {
                    await AsyncStorage.removeItem('favorite_tag_id');
                    console.log('Cleared favorite tag ID for deleted tag');
                  }
                } catch (storageError) {
                  console.error('Error cleaning up favorite tag:', storageError);
                  // Don't fail the deletion if storage cleanup fails
                }
              }

              // Update local state
              setTags(tags.filter(tag => tag.token !== tagToken));

              ToastAndroid.showWithGravity(
                'Tag deleted successfully',
                ToastAndroid.SHORT,
                ToastAndroid.CENTER
              );
            } catch (error) {
              console.error('Error deleting tag:', error);
              ToastAndroid.showWithGravity(
                'Failed to delete tag',
                ToastAndroid.LONG,
                ToastAndroid.CENTER
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
              Nostr Management
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.content}>
            <ThemedText style={{ color: primaryTextColor }}>Loading...</ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isNfcEnabled === null) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={primaryTextColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
              Portal Tags
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.content}>
            <ThemedText style={{ color: primaryTextColor }}>Checking NFC status...</ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!isNfcEnabled) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={primaryTextColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
              Portal Tags
            </ThemedText>
          </ThemedView>

          <View style={styles.content}>
            <View style={[styles.nfcCourtesyContainer, { backgroundColor: surfaceSecondaryColor }]}>
              <WifiOff size={64} color={secondaryTextColor} />
              <ThemedText style={[styles.nfcCourtesyTitle, { color: primaryTextColor }]}>
                NFC Not Available
              </ThemedText>
              <ThemedText style={[styles.nfcCourtesyDescription, { color: secondaryTextColor }]}>
                NFC is not enabled on your device. To use Portal tags, you need to enable NFC in
                your device settings.
              </ThemedText>

              <View style={styles.nfcInstructions}>
                <ThemedText style={[styles.nfcInstructionsTitle, { color: primaryTextColor }]}>
                  How to enable NFC:
                </ThemedText>
                <View style={styles.nfcInstructionItem}>
                  <ThemedText style={[styles.nfcInstructionNumber, { color: buttonPrimaryColor }]}>
                    1
                  </ThemedText>
                  <ThemedText style={[styles.nfcInstructionText, { color: secondaryTextColor }]}>
                    Go to your device Settings
                  </ThemedText>
                </View>
                <View style={styles.nfcInstructionItem}>
                  <ThemedText style={[styles.nfcInstructionNumber, { color: buttonPrimaryColor }]}>
                    2
                  </ThemedText>
                  <ThemedText style={[styles.nfcInstructionText, { color: secondaryTextColor }]}>
                    Find "Connections" or "Connected devices"
                  </ThemedText>
                </View>
                <View style={styles.nfcInstructionItem}>
                  <ThemedText style={[styles.nfcInstructionNumber, { color: buttonPrimaryColor }]}>
                    3
                  </ThemedText>
                  <ThemedText style={[styles.nfcInstructionText, { color: secondaryTextColor }]}>
                    Enable "NFC" or "Near Field Communication"
                  </ThemedText>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.nfcRetryButton, { backgroundColor: buttonPrimaryColor }]}
                onPress={async () => {
                  const nfcEnabled = await checkNFCStatus();
                  setIsNfcEnabled(nfcEnabled);
                  if (!nfcEnabled) {
                    Alert.alert(
                      'NFC Still Disabled',
                      'NFC is still not enabled. Please check your device settings and try again.',
                      [{ text: 'OK' }]
                    );
                  }
                }}
              >
                <ThemedText style={[styles.nfcRetryButtonText, { color: buttonPrimaryTextColor }]}>
                  Check Again
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isWriting) {
    return (
      <NFCScanUI
        isNFCEnabled={isNfcEnabled}
        scanState="scanning"
        onBackPress={() => {
          setIsWriting(false);
          clearNfc();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={primaryTextColor} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
            Portal Tags
          </ThemedText>
        </ThemedView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={[styles.description, { color: secondaryTextColor }]}>
            Create and manage NFC tags for your Portal business. These tags can be used to trigger
            specific actions, payments, or information displays when customers scan them.
          </ThemedText>

          {/* Add New Tag Section */}
          <ThemedText style={[styles.titleText, { color: primaryTextColor }]}>
            Create New Tag
          </ThemedText>

          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, { borderBottomColor: inputBorderColor }]}>
              <TextInput
                style={[styles.input, { color: primaryTextColor }]}
                value={newTagToken}
                onChangeText={setNewTagToken}
                placeholder="Enter tag name"
                placeholderTextColor={inputPlaceholderColor}
              />
              <TouchableOpacity style={styles.textFieldAction} onPress={handleClearInput}>
                <X size={20} color={primaryTextColor} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, { borderBottomColor: inputBorderColor }]}>
              <TextInput
                style={[styles.input, { color: primaryTextColor }]}
                value={newTagDescription}
                onChangeText={setNewTagDescription}
                placeholder="Enter tag description (optional)"
                placeholderTextColor={inputPlaceholderColor}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.iconPickerButton, { backgroundColor: buttonSecondaryColor }]}
              onPress={() => {
                setIsIconModalVisible(true);
              }}
            >
              {newTagIcon ? (
                <>
                  {React.createElement(getIconComponent(newTagIcon), {
                    size: 20,
                    color: buttonSecondaryTextColor,
                  })}
                  <ThemedText style={[styles.iconPickerText, { color: buttonSecondaryTextColor }]}>
                    {newTagIcon}
                  </ThemedText>
                </>
              ) : (
                <>
                  <TagIcon size={20} color={buttonSecondaryTextColor} />
                  <ThemedText style={[styles.iconPickerText, { color: buttonSecondaryTextColor }]}>
                    Select Icon
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: buttonPrimaryColor }]}
            onPress={addNewTag}
          >
            <Plus size={20} color={buttonPrimaryTextColor} />
            <ThemedText style={[styles.addButtonText, { color: buttonPrimaryTextColor }]}>
              Create Tag
            </ThemedText>
          </TouchableOpacity>

          {/* Existing Tags Section */}
          {tags.length > 0 && (
            <>
              <ThemedText style={[styles.titleText, { color: primaryTextColor, marginTop: 30 }]}>
                Your Tags
              </ThemedText>

              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.tagItem, { backgroundColor: surfaceSecondaryColor }]}
                  >
                    <View style={styles.tagContent}>
                      <View style={[styles.tagIcon, { backgroundColor: buttonPrimaryColor }]}>
                        {tag.icon ? (
                          React.createElement(getIconComponent(tag.icon), {
                            size: 16,
                            color: buttonPrimaryTextColor,
                          })
                        ) : (
                          <TagIcon size={16} color={buttonPrimaryTextColor} />
                        )}
                      </View>
                      <View style={styles.tagText}>
                        <ThemedText style={[styles.tagName, { color: primaryTextColor }]}>
                          {decodeURIComponent(tag.token)}
                        </ThemedText>
                        <ThemedText style={[styles.tagStatus, { color: secondaryTextColor }]}>
                          {tag.description ? tag.description : 'Ready to use'}
                        </ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: buttonSecondaryColor }]}
                      onPress={() => deleteTag(tag.token)}
                    >
                      <ThemedText
                        style={[styles.deleteButtonText, { color: buttonSecondaryTextColor }]}
                      >
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {tags.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: surfaceSecondaryColor }]}>
              <TagIcon size={48} color={secondaryTextColor} />
              <ThemedText style={[styles.emptyStateTitle, { color: primaryTextColor }]}>
                No tags created yet
              </ThemedText>
              <ThemedText style={[styles.emptyStateDescription, { color: secondaryTextColor }]}>
                Create your first NFC tag to get started
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>

      <Modal
        visible={isIconModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsIconModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsIconModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor }]}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: primaryTextColor }]}>
                Select Icon
              </ThemedText>
              <TouchableOpacity
                onPress={() => setIsIconModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={secondaryTextColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={[styles.modalDescription, { color: secondaryTextColor }]}>
                Choose an icon for your tag
              </ThemedText>
              <View style={styles.iconGrid}>
                {availableIcons.map((iconName, index) => {
                  const IconComponent = getIconComponent(iconName);
                  const isSelected = newTagIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.iconItem,
                        {
                          backgroundColor: isSelected ? buttonPrimaryColor : surfaceSecondaryColor,
                        },
                      ]}
                      onPress={() => handleIconSelect(iconName)}
                    >
                      <IconComponent
                        size={24}
                        color={isSelected ? buttonPrimaryTextColor : primaryTextColor}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
  },
  textFieldAction: {
    position: 'absolute',
    right: 0,
    top: 8,
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagText: {
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tagStatus: {
    fontSize: 14,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  iconPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  iconPickerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
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
  modalBody: {
    flex: 1,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Add extra padding at bottom for better scrolling
  },
  nfcCourtesyContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  nfcCourtesyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  nfcCourtesyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  nfcInstructions: {
    width: '100%',
    marginBottom: 20,
  },
  nfcInstructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  nfcInstructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nfcInstructionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  nfcInstructionText: {
    fontSize: 14,
  },
  nfcRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nfcRetryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
