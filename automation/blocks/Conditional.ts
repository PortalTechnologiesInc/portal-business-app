import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export class Conditional implements BlockType {
  id = 'conditional';
  name = 'If Condition';
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'field',
        name: 'Field to Match',
        type: 'text',
        required: true,
        placeholder: 'e.g., body.status, headers.content-type'
      },
      {
        id: 'operator',
        name: 'Operator',
        type: 'select',
        required: true,
        defaultValue: 'equals',
        options: ['equals', 'not equals', 'greater than', 'less than', 'contains', 'not contains', 'exists', 'not exists']
      },
      {
        id: 'value',
        name: 'Value to Compare',
        type: 'text',
        required: false,
        placeholder: 'e.g., 200, "success", true'
      }
    ];
  }

  getInputs(): ConnectionPoint[] {
    return [
      { 
        id: 'input-1', 
        type: 'input', 
        x: 52, 
        y: -8,
        label: 'Data',
        dataFields: [
          { name: 'body', type: 'object', description: 'Input data object' },
          { name: 'headers', type: 'object', description: 'Input headers' },
          { name: 'status', type: 'number', description: 'Status code' },
          { name: 'url', type: 'string', description: 'Request URL' }
        ]
      }
    ];
  }

  getOutputs(): ConnectionPoint[] {
    return [
      { 
        id: 'output-true', 
        type: 'output', 
        x: 30, 
        y: 72,
        label: 'True',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      },
      { 
        id: 'output-false', 
        type: 'output', 
        x: 74, 
        y: 72,
        label: 'False',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      }
    ];
  }

  getWidth(): number {
    return 120;
  }

  getHeight(): number {
    return 80;
  }
}

export const conditional = new Conditional(); 