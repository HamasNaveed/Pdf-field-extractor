import { PDFDocument } from 'pdf-lib';

/**
 * Flattens PDF form fields, making them non-editable and embedding their visual text/state.
 */
export async function flattenPdf(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    const form = pdfDoc.getForm();
    
    // Flatten forms if fields are present
    form.flatten();
    
    const flattenedPdfBytes = await pdfDoc.save();
    return Buffer.from(flattenedPdfBytes);
  } catch (error) {
    console.error('Error flattening PDF form:', error);
    throw error;
  }
}
