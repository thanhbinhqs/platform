export type FieldType = 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number;
}
