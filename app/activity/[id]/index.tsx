import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { formatDayAndDate } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import { useActivities } from '@/context/ActivitiesContext';
import { parseCalendar } from 'portal-app-lib';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, fromUnixSeconds, type SubscriptionWithDates } from '@/services/database';


export default function ActivityDetailScreen() {
    const { id } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState(null);

    const handleBackPress = () => {
        router.back();
    };

    useEffect(() => {
        // Simulate loading data
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.almostWhite} />
                </ThemedView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ThemedView style={styles.container}>
                <View style={styles.header}>
                    <FontAwesome6
                        name="arrow-left"
                        size={24}
                        color={Colors.almostWhite}
                        onPress={handleBackPress}
                        style={styles.backButton}
                    />
                    <ThemedText type="title" style={styles.title}>
                        Activity Details
                    </ThemedText>
                </View>

                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.activityHeader}>
                            <ThemedText type="subtitle" style={styles.activityName}>
                                Activity {id}
                            </ThemedText>
                            <ThemedText style={styles.amount}>
                                $XX.XX
                            </ThemedText>
                        </View>

                        <View style={styles.detailsContainer}>
                            <ThemedText
                                style={styles.detail}
                                darkColor={Colors.dirtyWhite}
                                lightColor={Colors.dirtyWhite}
                            >
                                Date: {formatDayAndDate(new Date())}
                            </ThemedText>
                            <ThemedText
                                style={styles.detail}
                                darkColor={Colors.dirtyWhite}
                                lightColor={Colors.dirtyWhite}
                            >
                                Status: Completed
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.sectionContainer}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>
                            Activity Information
                        </ThemedText>
                        
                        <View style={styles.infoItem}>
                            <ThemedText style={styles.infoText}>
                                This is where activity details would be displayed.
                            </ThemedText>
                        </View>
                    </View>
                </ScrollView>
            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.darkerGray,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.darkerGray,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.darkerGray,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        marginTop: 16,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    activityName: {
        fontSize: 20,
    },
    amount: {
        fontSize: 20,
        fontWeight: '300',
    },
    detailsContainer: {
        marginTop: 16,
    },
    detail: {
        marginVertical: 4,
    },
    sectionContainer: {
        marginTop: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    infoItem: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    infoText: {
        fontSize: 16,
        color: Colors.almostWhite,
    },
});