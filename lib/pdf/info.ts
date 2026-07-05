import { PDFDocument, PDFName, PDFDict, PDFRef } from 'pdf-lib';
import { PDFInfoData } from '../../types';

export async function extractPdfInfo(pdfBuffer: Buffer, fileName: string): Promise<PDFInfoData> {
  try {
    // Attempt loading standard PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    
    const pages = pdfDoc.getPageCount();
    let hasAcroForm = false;
    let hasXFA = false;
    let fieldCount = 0;

    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      fieldCount = fields.length;
      if (fieldCount > 0) {
        hasAcroForm = true;
      }
    } catch {
      fieldCount = 0;
    }

    try {
      const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
      const acroForm = acroFormRef instanceof PDFRef ? pdfDoc.context.lookup(acroFormRef) : acroFormRef;
      if (acroForm instanceof PDFDict) {
        hasAcroForm = true;
        const xfa = acroForm.get(PDFName.of('XFA'));
        hasXFA = xfa !== undefined;
      }
    } catch {
      // Ignore XFA check errors
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
