import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'react-native';

export default function Step1() {
  const handleGenerateKey = () => {
    // Will handle key generation later
    router.replace('/');
  };

  const handleImportSeed = () => {
    // Will handle seed import later
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/images/logowhite.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.contentContainer}>
        <ThemedText type="title" style={styles.headline}>
          Welcome to Portal
        </ThemedText>

        <ThemedText style={styles.button} onPress={handleGenerateKey}>
          Generate your private key
        </ThemedText>

        <ThemedText style={styles.button} onPress={handleImportSeed}>
          Import existing seed
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    marginTop: 100,
    width: 300,
    height: 200,
  },
  logoContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headline: {
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    fontSize: 16,
    backgroundColor: '#0a7ea4',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
  },
});