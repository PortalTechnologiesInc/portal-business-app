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

    return (
        <View>
            <ThemedText>Activity Detail for {id}</ThemedText>
        </View>
    );
}