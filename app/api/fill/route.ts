import { NextResponse } from 'next/server';
import { extractPdfInfo } from '@/lib/pdf/info';
import { fillPdf } from '@/lib/pdf/fill';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf');
    const dataStr = formData.get('data');

    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No PDF file uploaded. Please provide a "pdf" field.' },
        { status: 400 }
      );
    }

    if (!dataStr || typeof dataStr !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'No form fill data provided. Please provide a "data" string containing JSON.',
        },
        { status: 400 }
      );
    }

    let fillData: Record<string, any> = {};
    try {
      fillData = JSON.parse(dataStr);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in the "data" field.' },
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

    // Fill standard AcroForm fields
    const filledPdfBuffer = await fillPdf(pdfBuffer, fillData);

    const baseName = fileName.replace(/\.pdf$/i, '');
    const outFileName = `${baseName}_filled.pdf`;

    return new Response(new Uint8Array(filledPdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('API Error in /api/fill:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
