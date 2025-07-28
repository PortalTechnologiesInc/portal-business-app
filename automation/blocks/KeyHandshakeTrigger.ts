import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export class KeyHandshakeTrigger implements BlockType {
  id = 'trigger';
  name = 'Key Handshake';
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'token',
        name: 'Token',
        type: 'text',
        required: true,
        placeholder: 'your-token-here'
      },
    ];
  }

  getInputs(): ConnectionPoint[] {
    return []; // Triggers typically don't have inputs
  }

  getOutputs(): ConnectionPoint[] {
    return [
      { 
        id: 'main-key', 
        type: 'output', 
        x: 47, 
        y: 72,
        label: 'User Key',
        dataFields: [
          { name: 'main_key', type: 'string', description: 'User Key' },
        ]
      }
    ];
  }

  getWidth(): number {
    return 110;
  }

  getHeight(): number {
    return 80;
  }

  async run(inputs: Promise<any>[]): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Key handshake trigger');
        resolve({
          'main-key': '1234567890'
        });
      }, 1000);
    });
  }
}

export const keyHandshakeTrigger = new KeyHandshakeTrigger(); 