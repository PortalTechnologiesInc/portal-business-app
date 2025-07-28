import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export const constant: BlockType = {
  id: 'constant',
  name: 'Constant',
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'value',
        name: 'Value',
        type: 'text',
        required: true,
        placeholder: 'Enter constant value'
      },
      {
        id: 'type',
        name: 'Type',
        type: 'select',
        required: true,
        defaultValue: 'string',
        options: ['string', 'number', 'boolean', 'object']
      }
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [];
  },

  getOutputs(): ConnectionPoint[] {
    return [
      {
        id: 'output-value',
        type: 'output',
        x: 90,
        y: 52,
        label: 'Value',
        dataFields: [
          { name: 'value', type: 'string', description: 'Constant value' },
          { name: 'type', type: 'string', description: 'Value type' }
        ]
      }
    ];
  },

  getWidth(): number { return 120; },
  getHeight(): number { return 60; }
}; 