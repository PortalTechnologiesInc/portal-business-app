import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export const split: BlockType = {
  id: 'split',
  name: 'Split',
  
  getSettings(): BlockParameter[] {
    return [
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [
      {
        id: 'input-value',
        type: 'input',
        x: 52,
        y: -8,
        label: 'Value',
        dataFields: [
          { name: 'value', type: 'object', description: 'Passthrough data' }
        ]
      }
    ];
  },

  getOutputs(): ConnectionPoint[] {
    return [
      {
        id: 'output-left',
        type: 'output',
        x: 30,
        y: 72,
        label: 'L',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      },
      {
        id: 'output-right',
        type: 'output',
        x: 74,
        y: 72,
        label: 'R',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      }
    ];
  },

  getWidth(): number { return 120; },
  getHeight(): number { return 80; }
}; 