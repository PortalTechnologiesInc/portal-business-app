import {
  KeypairInterface,
  PortalBusiness,
  PortalBusinessInterface,
  RelayStatusListener,
} from 'portal-business-app-lib';

export class PortalAppManager {
  static instance: PortalBusinessInterface;

  private constructor() {}

  static async getInstance(
    keypair: KeypairInterface,
    relays: string[],
    relayStatusCallback: RelayStatusListener
  ) {
    if (!PortalAppManager.instance) {
      console.warn('Initializing the lib!');
      this.instance = await PortalBusiness.create(keypair, relays, relayStatusCallback);
    }

    return this.instance;
  }

  static tryGetInstance() {
    if (!this.instance) {
      throw new Error('PortalAppManager not initialized');
    }

    return this.instance;
  }
}
