# Portal App

![Portal App](https://github.com/PortalTechnologiesInc/.github/raw/main/profile/logoFull.png?raw=true)

Portal is a mobile identity wallet for secure authentication and payments using [Nostr](https://nostr.com) protocol. It puts you in complete control of your digital identity and personal data.

## Features

- **Nostr Authentication**: Securely authenticate with websites and services without exposing sensitive information
- **Payment Management**: Make one-time payments and manage subscription payments
- **Wallet Integration**: Connect to your Nostr wallet (NWC) for seamless transactions
- **Activity Tracking**: View and manage your authentication and payment history
- **Subscription Management**: Monitor and control recurring payments
- **Secure Storage**: Your keys never leave your device, ensuring maximum security

## Technology Stack

- **React Native** with **Expo** for cross-platform mobile development
- **Nostr Protocol** for decentralized authentication and payments
- **SQLite** for local secure data storage
- **TypeScript** for type safety
- Our [Rust library](https://github.com/PortalTechnologiesInc/lib) for the logic

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/PortalTechnologiesInc/Portal-App.git
   cd Portal-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

## Usage

1. **First-time Setup**:
   - Generate a new private key or import an existing seed phrase
   - Set up your profile information

2. **Authentication**:
   - Scan a Portal QR code from a website
   - Review the authentication request details
   - Approve or deny the request

3. **Payments**:
   - Review payment requests from services
   - Process one-time payments
   - Approve subscription requests

4. **Wallet Connection**:
   - Connect your NWC-compatible wallet for payments

## Development

### Project Structure

- `/app`: Main application screens using Expo Router
- `/components`: Reusable UI components
- `/context`: React context providers for state management
- `/models`: TypeScript interfaces and types
- `/services`: Core functionality including database, Nostr, and secure storage

### Commands

- `npm start`: Start the development server
- `npm run android`: Run on Android emulator/device
- `npm run ios`: Run on iOS simulator/device

## License

This project is licensed under the MIT License with Common Clause - see the LICENSE file for details.

## Security

Portal prioritizes your security and privacy:
- All private keys are stored securely on your device
- Authentication is cryptographically verified
- No personal data is shared without your explicit consent
