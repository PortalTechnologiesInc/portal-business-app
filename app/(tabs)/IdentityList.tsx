import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Identity } from '../../models/Identity';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { getMockedIdentities } from '../../mocks/Identities';

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
        <View style={styles.listItem}>
            <ThemedText>{item.name}</ThemedText>
            <View style={styles.buttonsContainer}>
                <ThemedText style={styles.manageButton} onPress={() => onManageIdentity(item)}>Manage</ThemedText>
                <ThemedText style={styles.deleteButton} onPress={() => onDeleteIdentity(item)}>Delete</ThemedText>
            </View>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">Master Key</ThemedText>
                <ThemedText style={styles.masterKeyDisplay}>ax87DJe9IjdDJi40PoaW55tR...</ThemedText>
                <TouchableOpacity style={styles.createButton} onPress={() => router.navigate('/')}>
                    <ThemedText style={styles.createButtonText}>Create Identity</ThemedText>
                </TouchableOpacity>
            </ThemedView>
            <FlatList
                data={identities}
                renderItem={renderItem}
                keyExtractor={(item) => item.publicKey}
                style={styles.list}
                contentContainerStyle={styles.listContent}
            />
        </ThemedView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black', // Example background color
    },
    header: {
        padding: 20,
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
        color: 'black', // Example text color
        textAlign: 'center',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16, // Add horizontal padding to list content
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12, // Adjust vertical padding
        borderBottomWidth: 1,
        borderBottomColor: '#eee', // Use a lighter border color
    },
    buttonsContainer: {
        flexDirection: 'row',
    },
    manageButton: {
        marginRight: 10,
        color: 'blue', // Example color, adjust as needed
        fontSize: 16, // Adjust font size
    },
    deleteButton: {
        color: 'red', // Example color, adjust as needed
        fontSize: 16, // Adjust font size
    },
});
