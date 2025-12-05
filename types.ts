export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  generalComment: string;
  timestamp: number;
}

export enum ValidationStatus {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface HistoryItem {
  id: string;
  dtd: string;
  xml: string;
  result: ValidationResult;
}

export type Language = 'en' | 'zh';