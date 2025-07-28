import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

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
        y: 45,
        label: 'Value',
        dataFields: [
          { name: 'value', type: 'string', description: 'Constant value' },
          { name: 'type', type: 'string', description: 'Value type' }
        ]
      }
    ];
  },

  getWidth(): number { return 120; },
  getHeight(): number { return 60; },

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<any> {
    const constantValue = config?.parameters?.value as string;
    const constantType = config?.parameters?.type as string;

    let value: any = constantValue;
    if (constantType === 'number') {
      value = parseFloat(constantValue);
    } else if (constantType === 'boolean') {
      value = constantValue === 'true';
    } else if (constantType === 'object') {
      value = JSON.parse(constantValue);
    }
    
    return {
      'output-value': value
    };
  }
}; 