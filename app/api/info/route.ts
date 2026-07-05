import { NextResponse } from 'next/server';
import { extractPdfInfo } from '@/lib/pdf/info';

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

    const info = await extractPdfInfo(pdfBuffer, fileName);
    
    if (!info.success) {
      if (info.encrypted) {
        return NextResponse.json(
          {
            success: false,
            error: 'This PDF is encrypted and cannot be processed.',
            encrypted: true,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to extract PDF information.' },
        { status: 400 }
      );
    }

    return NextResponse.json(info);
  } catch (error: any) {
    console.error('API Error in /api/info:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
