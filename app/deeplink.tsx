import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { parseAuthInitUrl } from 'portal-app-lib';
import { useNostrService } from '@/context/NostrServiceContext';
import { usePendingRequests } from '@/context/PendingRequestsContext';
import { Colors } from '@/constants/Colors';

export default function DeepLinkHandler() {
  const { url } = useLocalSearchParams();
  const { showSkeletonLoader } = usePendingRequests();
  const nostrService = useNostrService();

  useEffect(() => {
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
                await nostrService.sendAuthInit(parsedUrl);
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
                await nostrService.sendAuthInit(parsedUrl);
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

    // Process the deeplink if NostrService is initialized
    if (nostrService.isInitialized) {
      handleDeepLink();
    } else {
      console.log('NostrService not yet initialized, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [url, showSkeletonLoader, nostrService]);

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
