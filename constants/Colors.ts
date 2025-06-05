/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  almostWhite: '#e6e6e6',
  dirtyWhite: '#bfbfbf',
  gray: '#b3b3b3',
  unselectedGray: '#687076',
  darkGray: '#222222',
  darkerGray: '#0c0c0c',
  green: '#004f4e',
  red: '#710729',

  // Major palette colors
  primary: '#0a7ea4',
  primaryLight: '#4fb3d9',
  primaryDark: '#005a75',
  secondary: '#f39c12',
  secondaryLight: '#f7dc6f',
  secondaryDark: '#d68910',

  // Semantic colors
  success: '#27ae60',
  successLight: '#58d68d',
  successDark: '#1e8449',
  warning: '#f39c12',
  warningLight: '#f7dc6f',
  warningDark: '#d68910',
  error: '#e74c3c',
  errorLight: '#ec7063',
  errorDark: '#c0392b',
  info: '#3498db',
  infoLight: '#85c1e9',
  infoDark: '#2874a6',

  // Neutral palette
  white: '#ffffff',
  black: '#000000',
  gray100: '#f8f9fa',
  gray200: '#e9ecef',
  gray300: '#dee2e6',
  gray400: '#ced4da',
  gray500: '#adb5bd',
  gray600: '#6c757d',
  gray700: '#495057',
  gray800: '#343a40',
  gray900: '#212529',

  // Accent colors
  purple: '#9b59b6',
  purpleLight: '#bb8fce',
  purpleDark: '#7d3c98',
  orange: '#e67e22',
  orangeLight: '#f0b27a',
  orangeDark: '#ca6f1e',
  teal: '#1abc9c',
  tealLight: '#76d7c4',
  tealDark: '#148f77',
};
