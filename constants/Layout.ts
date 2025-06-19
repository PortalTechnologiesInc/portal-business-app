import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const Layout = {
  // Card dimensions
  cardWidth: width - 70, // Original card width
  cardMargin: 16, // Standard margin between cards

  // Screen dimensions (for convenience)
  screenWidth: width,

  // Common padding values
  paddingHorizontal: 20,
  paddingVertical: 16,

  // Border radius values
  borderRadiusSmall: 8,
  borderRadiusMedium: 12,
  borderRadiusLarge: 20,
};
