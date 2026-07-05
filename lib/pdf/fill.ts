import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
} from 'pdf-lib';

/**
 * Fills PDF form fields with matching JSON payload keys and values.
 */
export async function fillPdf(
  pdfBuffer: Buffer,
  data: Record<string, any>
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    const form = pdfDoc.getForm();

    for (const [key, value] of Object.entries(data)) {
      const field = form.getFieldMaybe(key);
      if (!field) continue;

      try {
        if (field instanceof PDFTextField) {
          field.setText(String(value ?? ''));
        } else if (field instanceof PDFCheckBox) {
          const isTrueValue =
            value === true ||
            String(value).toLowerCase() === 'true' ||
            String(value).toLowerCase() === 'yes' ||
            String(value) === '1' ||
            String(value) === 'on';

          if (isTrueValue) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(value));
        } else if (field instanceof PDFDropdown) {
          if (Array.isArray(value)) {
            field.select(value.map(String));
          } else {
            field.select(String(value));
          }
        } else if (field instanceof PDFOptionList) {
          if (Array.isArray(value)) {
            field.select(value.map(String));
          } else {
            field.select(String(value));
          }
        }
      } catch (err) {
        console.warn(`Could not set field "${key}" to value "${value}":`, err);
      }
    }

    const filledPdfBytes = await pdfDoc.save();
    return Buffer.from(filledPdfBytes);
  } catch (error) {
    console.error('Error filling PDF form:', error);
    throw error;
  }
}
