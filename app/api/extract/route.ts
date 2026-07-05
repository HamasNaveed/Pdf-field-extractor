import { NextResponse } from 'next/server';
import { extractPdfInfo } from '@/lib/pdf/info';
import { extractPdfFields } from '@/lib/pdf/fields';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf');

    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No PDF file uploaded. Please provide a "pdf" field.' },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const fileName = pdfFile.name;

    // Run PDF pre-flight checks for XFA and Encryption
    const info = await extractPdfInfo(pdfBuffer, fileName);
    if (!info.success) {
      if (info.encrypted) {
        return NextResponse.json(
          { success: false, error: 'This PDF is encrypted and cannot be processed.' },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to process PDF file.' },
        { status: 400 }
      );
    }

    if (info.hasXFA) {
      return NextResponse.json(
        { success: false, error: 'This PDF uses XFA forms which are not supported.' },
        { status: 422 }
      );
    }

    // Extract all AcroForm field details with coordinates and labels
    const data = await extractPdfFields(pdfBuffer, fileName);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error in /api/extract:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
