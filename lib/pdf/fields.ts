import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRef,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFButton,
  PDFDropdown,
  PDFOptionList,
  PDFSignature,
} from 'pdf-lib';
import { PDFFieldData, PDFExtractResponse, PDFFieldType } from '../../types';
import { detectLabel, extractAllPageTexts } from './labelDetector';

/**
 * Resolves the default value of a field from its raw /DV key in the PDF catalog dictionary.
 */
function getFieldDefaultValue(field: any): string {
  try {
    const dv = field.acroField.dict.get(PDFName.of('DV'));
    if (!dv) return '';
    if (typeof (dv as any).decodeText === 'function') {
      return (dv as any).decodeText();
    }
    if (typeof (dv as any).value === 'function') {
      return (dv as any).value();
    }
    if (typeof (dv as any).value === 'string') {
      return (dv as any).value;
    }
    if (typeof (dv as any).asString === 'function') {
      return (dv as any).asString();
    }
    return String(dv);
  } catch {
    return '';
  }
}

/**
 * Extracts metadata, visual positions, and nearby labels for all fillable fields in the PDF.
 */
export async function extractPdfFields(
  pdfBuffer: Buffer,
  fileName: string
): Promise<PDFExtractResponse> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    // 1. Extract all visible text items for proximity label detection
    const pageTextsMap = await extractAllPageTexts(pdfBuffer);

    // 2. Build map of widget object reference -> 1-based page index
    const refToPageMap = new Map<number, number>();
    const pageRefMap = new Map<string, number>();

    pages.forEach((page, pageIndex) => {
      pageRefMap.set(page.ref.toString(), pageIndex + 1);
      const annots = page.node.Annots();
      if (annots) {
        for (let i = 0; i < annots.size(); i++) {
          const ref = annots.get(i);
          if (ref instanceof PDFRef) {
            refToPageMap.set(ref.objectNumber, pageIndex + 1);
          }
        }
      }
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const extractedFields: PDFFieldData[] = [];

    for (const field of fields) {
      const internalName = field.getName();
      const widgets = field.acroField.getWidgets();

      // Common properties across all widgets of the field
      const required = field.isRequired();
      const readonly = field.isReadOnly();

      // Type mapping
      let type: PDFFieldType = 'unknown';
      if (field instanceof PDFTextField) {
        type = 'text';
      } else if (field instanceof PDFCheckBox) {
        type = 'checkbox';
      } else if (field instanceof PDFRadioGroup) {
        type = 'radio';
      } else if (field instanceof PDFButton) {
        type = 'button';
      } else if (field instanceof PDFDropdown) {
        // Choice fields: if it allows custom typing (Edit flag is set: 0x40000 / bit 19), it is a combo box
        const fFlags = field.acroField.getFlags() || 0;
        const isEdit = (fFlags & 0x40000) !== 0;
        type = isEdit ? 'combobox' : 'dropdown';
      } else if (field instanceof PDFOptionList) {
        type = 'listbox';
      } else if (field instanceof PDFSignature) {
        type = 'signature';
      }

      // Options (Choice & Radio fields)
      let options: string[] = [];
      if (
        field instanceof PDFDropdown ||
        field instanceof PDFOptionList ||
        field instanceof PDFRadioGroup
      ) {
        options = field.getOptions();
      }

      // Max length (Text fields)
      let maxLength: number | null = null;
      if (field instanceof PDFTextField) {
        maxLength = field.getMaxLength() || null;
      }

      // Multiline / Password flags (Text fields)
      let multiline = false;
      let password = false;
      if (field instanceof PDFTextField) {
        multiline = field.isMultiline();
        password = field.isPassword();
      }

      for (const widget of widgets) {
        // Resolve 1-based page number
        let pageNum = 1;
        const pageRef = widget.dict.get(PDFName.of('P'));
        const widgetRef = pdfDoc.context.getObjectRef(widget.dict);
        if (pageRef instanceof PDFRef && pageRefMap.has(pageRef.toString())) {
          pageNum = pageRefMap.get(pageRef.toString())!;
        } else if (widgetRef && refToPageMap.has(widgetRef.objectNumber)) {
          pageNum = refToPageMap.get(widgetRef.objectNumber)!;
        }

        // Bounding box rect
        const rectObj = widget.getRectangle();
        const rect = {
          x: Math.round(rectObj.x),
          y: Math.round(rectObj.y),
          width: Math.round(rectObj.width),
          height: Math.round(rectObj.height),
        };

        // Rotation
        let rotation = 0;
        const rVal = widget.dict.get(PDFName.of('R'));
        if (rVal && typeof (rVal as any).asNumber === 'function') {
          rotation = (rVal as any).asNumber();
        }

        // Annotation flags (hidden: bit 2, print: bit 3)
        const flags = widget.getFlags() || 0;
        const hidden = (flags & 2) !== 0;
        const printable = (flags & 4) !== 0;

        // Current & Default & Export values mapping
        let currentValue = '';
        let defaultValue = '';
        let exportValue: string | null = null;

        if (field instanceof PDFTextField) {
          currentValue = field.getText() || '';
          defaultValue = getFieldDefaultValue(field);
        } else if (field instanceof PDFCheckBox) {
          try {
            exportValue = widget.getOnValue()?.toString() || null;
          } catch {}
          currentValue = field.isChecked() ? (exportValue || 'true') : '';
          
          const defaultVal = getFieldDefaultValue(field);
          defaultValue = defaultVal === exportValue ? (exportValue || 'true') : '';
        } else if (field instanceof PDFRadioGroup) {
          // Resolve export value specifically for this radio option widget
          try {
            const ap = widget.dict.get(PDFName.of('AP'));
            if (ap instanceof PDFDict) {
              const n = ap.get(PDFName.of('N'));
              const resolvedN = n instanceof PDFRef ? pdfDoc.context.lookup(n) : n;
              if (resolvedN instanceof PDFDict) {
                const keys = resolvedN.keys();
                const onKey = keys.find(k => k.value() !== 'Off');
                exportValue = onKey ? onKey.value() : null;
              }
            }
          } catch {}

          currentValue = field.getSelected() || '';
          defaultValue = getFieldDefaultValue(field);
        } else if (field instanceof PDFDropdown) {
          currentValue = field.getSelected()?.[0] || '';
          defaultValue = getFieldDefaultValue(field);
        } else if (field instanceof PDFOptionList) {
          currentValue = field.getSelected()?.join(', ') || '';
          defaultValue = getFieldDefaultValue(field);
        }

        // Run proximity label detection
        const pageTexts = pageTextsMap.get(pageNum);
        const label = detectLabel(rect, pageTexts);

        extractedFields.push({
          internalName,
          label,
          type,
          page: pageNum,
          required,
          readonly,
          hidden,
          printable,
          currentValue,
          defaultValue,
          exportValue,
          options,
          maxLength,
          multiline,
          password,
          rotation,
          rect,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    return {
      success: true,
      fileName,
      pageCount,
      fieldCount: extractedFields.length,
      fields: extractedFields,
    };
  } catch (error: any) {
    console.error('Error extracting PDF fields:', error);
    throw error;
  }
}
