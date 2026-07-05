import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import { PDFInfoData } from '../../types';

export async function extractPdfInfo(pdfBuffer: Buffer, fileName: string): Promise<PDFInfoData> {
  try {
    // Attempt loading standard PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    
    const pages = pdfDoc.getPageCount();
    let hasAcroForm = false;
    let hasXFA = false;
    let fieldCount = 0;

    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (acroForm instanceof PDFDict) {
      hasAcroForm = true;
      try {
        const form = pdfDoc.getForm();
        fieldCount = form.getFields().length;
      } catch {
        fieldCount = 0;
      }
      
      const xfa = acroForm.get(PDFName.of('XFA'));
      hasXFA = xfa !== undefined;
    }

    return {
      success: true,
      fileName,
      pages,
      fieldCount,
      hasAcroForm,
      hasXFA,
      encrypted: false,
    };
  } catch (error: any) {
    const errMsg = (error?.message || '').toLowerCase();
    const isEncrypted =
      errMsg.includes('encrypt') ||
      errMsg.includes('password') ||
      errMsg.includes('decrypt') ||
      error?.name === 'PasswordRequirementError';

    return {
      success: false,
      fileName,
      pages: 0,
      fieldCount: 0,
      hasAcroForm: false,
      hasXFA: false,
      encrypted: isEncrypted,
    };
  }
}
