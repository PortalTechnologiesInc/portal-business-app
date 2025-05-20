import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { parseAuthInitUrl } from 'portal-app-lib';
import { getNostrServiceInstance } from '@/services/nostr/NostrService';
import { usePendingRequests } from '@/context/PendingRequestsContext';
import { Colors } from '@/constants/Colors';

export default function DeepLinkHandler() {
  const { url } = useLocalSearchParams();
  const { showSkeletonLoader } = usePendingRequests();

  useEffect(() => {
    // Function to check if NostrService is initialized
    const isNostrServiceReady = () => {
      try {
        const nostrService = getNostrServiceInstance();
        return nostrService?.isInitialized?.();
      } catch (error) {
        console.log('NostrService not yet available:', error);
        return false;
      }
    };

    const handleDeepLink = async () => {
      if (typeof url === 'string' && url) {
        try {
          console.log('Processing deeplink URL:', url);

          if (url.startsWith('portal://')) {
            try {
              // Try to parse the URL
              const parsedUrl = parseAuthInitUrl(url);

              if (parsedUrl) {
                console.log('URL parsed successfully:', parsedUrl);

                // Show loading state
                showSkeletonLoader(parsedUrl);

                // Send the auth request
                await getNostrServiceInstance().sendAuthInit(parsedUrl);
                console.log('Auth request sent successfully');
              } else {
                console.error('URL parsed as null or undefined');
              }
            } catch (error) {
              console.error('Error processing portal deeplink:', error);
            }
          } else {
            // Try to parse any URL format as a fallback
            console.log('Processing URL with unknown format:', url);
            try {
              const parsedUrl = parseAuthInitUrl(url);
              if (parsedUrl) {
                showSkeletonLoader(parsedUrl);
                await getNostrServiceInstance().sendAuthInit(parsedUrl);
              } else {
                console.error('Failed to parse URL with unknown format');
              }
            } catch (error) {
              console.error('Failed to parse URL:', error);
            }
          }
        } catch (error) {
          console.error('Error processing deeplink:', error);
        } finally {
          // Navigate to home page regardless of success/failure
          router.replace('/(tabs)');
        }
      } else {
        // If no URL parameter, just go to home
        router.replace('/(tabs)');
      }
    };

    // Check until NostrService is initialized before processing the URL
    let initCheckCount = 0;
    const maxChecks = 10; // Maximum number of checks to prevent infinite loop

    const waitForInitialization = () => {
      if (isNostrServiceReady()) {
        console.log('NostrService is initialized, processing deeplink...');
        handleDeepLink();
      } else if (initCheckCount < maxChecks) {
        initCheckCount++;
        console.log(`Waiting for initialization... (attempt ${initCheckCount}/${maxChecks})`);
        // Increase the delay to give more time for initialization
        setTimeout(waitForInitialization, 1000);
      } else {
        console.error('NostrService initialization timed out, attempting to process anyway');
        handleDeepLink();
      }
    };

    // Start checking if NostrService is initialized
    const timer = setTimeout(waitForInitialization, 1000);

    return () => clearTimeout(timer);
  }, [url, showSkeletonLoader]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
      }}
    >
      <ActivityIndicator size="large" color={Colors.almostWhite} />
    </View>
  );
}
