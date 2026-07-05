import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFSignature,
  PDFName,
} from 'pdf-lib';
import { PDFValidateResponse, PDFValidationError } from '../../types';

/**
 * Validates a PDF form's fields against standard requirements (required states, signature existence, dates).
 */
export async function validatePdf(pdfBuffer: Buffer): Promise<PDFValidateResponse> {
  const errors: PDFValidationError[] = [];

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    for (const field of fields) {
      const internalName = field.getName();
      const required = field.isRequired();

      if (field instanceof PDFTextField) {
        const value = (field.getText() || '').trim();
        
        if (required && value === '') {
          errors.push({
            field: internalName,
            reason: 'Field is required and empty',
          });
        } else if (value !== '') {
          // Date format validation if field name suggests it stores a date
          const isDateField = internalName.toLowerCase().includes('date');
          if (isDateField) {
            // Check if string can be parsed into a valid Date object
            const parsedDate = Date.parse(value);
            // Also enforce minimum format checks to exclude trivial single digits
            const hasEnoughDigits = (value.match(/\d/g) || []).length >= 4;
            if (isNaN(parsedDate) || !hasEnoughDigits) {
              errors.push({
                field: internalName,
                reason: 'Invalid date format',
              });
            }
          }
        }
      } else if (field instanceof PDFCheckBox) {
        if (required && !field.isChecked()) {
          errors.push({
            field: internalName,
            reason: 'Required checkbox is not checked',
          });
        }
      } else if (field instanceof PDFDropdown) {
        const selected = field.getSelected();
        const hasSelection = selected && selected.length > 0 && selected[0].trim() !== '';
        if (required && !hasSelection) {
          errors.push({
            field: internalName,
            reason: 'Dropdown selection missing',
          });
        }
      } else if (field instanceof PDFOptionList) {
        const selected = field.getSelected();
        const hasSelection = selected && selected.length > 0;
        if (required && !hasSelection) {
          errors.push({
            field: internalName,
            reason: 'List box selection missing',
          });
        }
      } else if (field instanceof PDFSignature) {
        // A signature field is considered signed in pdf-lib if it holds a value key
        const isSigned = field.acroField.dict.get(PDFName.of('V')) !== undefined;
        if (required && !isSigned) {
          errors.push({
            field: internalName,
            reason: 'Signature missing',
          });
        }
      }
    }

    return {
      success: true,
      valid: errors.length === 0,
      errors,
    };
  } catch (error: any) {
    console.error('Validation error parsing PDF:', error);
    return {
      success: false,
      valid: false,
      errors: [
        {
          field: 'document',
          reason: error?.message || 'Error processing document validation',
        },
      ],
    };
  }
}
