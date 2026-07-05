export interface PDFFieldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PDFFieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'button'
  | 'combobox'
  | 'dropdown'
  | 'listbox'
  | 'signature'
  | 'unknown';

export interface PDFFieldData {
  internalName: string;
  label: string | null;
  type: PDFFieldType;
  page: number;
  required: boolean;
  readonly: boolean;
  hidden: boolean;
  printable: boolean;
  currentValue: string;
  defaultValue: string;
  exportValue: string | null;
  options: string[];
  maxLength: number | null;
  multiline: boolean;
  password: boolean;
  rotation: number;
  rect: PDFFieldRect;
  // Direct coordinates matching "Extract Every Property" requirements
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFInfoData {
  success: boolean;
  fileName: string;
  pages: number;
  fieldCount: number;
  hasAcroForm: boolean;
  hasXFA: boolean;
  encrypted: boolean;
}

export interface PDFExtractResponse {
  success: boolean;
  fileName: string;
  pageCount: number;
  fieldCount: number;
  fields: PDFFieldData[];
}

export interface PDFValidationError {
  field: string;
  reason: string;
}

export interface PDFValidateResponse {
  success: boolean;
  valid: boolean;
  errors: PDFValidationError[];
}
