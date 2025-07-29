export interface BlockParameter {
  id: string;
  name: string;
  type: 'text' | 'number' | 'url' | 'select';
  required: boolean;
  defaultValue?: string | number;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface BlockType {
  id: string;
  name: string;
  getSettings: () => BlockParameter[];
  getInputs: () => ConnectionPoint[];
  getOutputs: () => ConnectionPoint[];
  getWidth: () => number;
  getHeight: () => number;
  run: (inputs: any[], config?: BlockConfig) => Promise<Promise<any>[]>;
}

export interface BlockConfig {
  id: string;
  blockId: string;
  parameters: { [key: string]: string | number };
}

export interface Block {
  id: string;
  x: number;
  y: number;
  type: string;
  title: string;
  width: number;
  height: number;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface ConnectionPoint {
  id: string;
  type: 'input' | 'output';
  x: number;
  y: number;
  label?: string;
  dataFields?: DataField[]; // For outputs: what data is provided, for inputs: what data is expected
}

export interface Connection {
  id: string;
  fromBlockId: string;
  fromOutputId: string;
  toBlockId: string;
  toInputId: string;
} 