import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PageTextItemsMap = Map<number, TextItem[]>;

/**
 * Extracts visible text elements from all pages in the PDF document.
 */
export async function extractAllPageTexts(pdfBuffer: Buffer): Promise<PageTextItemsMap> {
  const pageTextsMap = new Map<number, TextItem[]>();

  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
    });

    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const items: TextItem[] = [];

      for (const item of textContent.items) {
        if ('str' in item) {
          const text = item.str.trim();
          // Skip empty text runs and pure punctuation noise
          if (text === '' || text === '*' || text === ':' || text === '_') continue;

          const transform = item.transform; // [a, b, c, d, tx, ty]
          const x = transform[4];
          const y = transform[5];
          const height = transform[3]; // vertical scale

          items.push({
            text: item.str,
            x,
            y,
            width: item.width,
            height: item.height || height,
          });
        }
      }
      pageTextsMap.set(p, items);
    }

    await loadingTask.destroy();
  } catch (error) {
    console.error('Error extracting page text content via pdfjs:', error);
  }

  return pageTextsMap;
}

/**
 * Detects the visual label closest to a given field widget bounding box.
 */
export function detectLabel(
  rect: { x: number; y: number; width: number; height: number },
  pageTexts: TextItem[] | undefined
): string | null {
  if (!pageTexts || pageTexts.length === 0) return null;

  let bestLabel: string | null = null;
  let bestScore = Infinity;
  const maxDistance = 150; // Threshold distance in PDF points (approx 2 inches)

  const fx = rect.x;
  const fy = rect.y;
  const fw = rect.width;
  const fh = rect.height;
  const fcy = fy + fh / 2; // field center Y

  for (const item of pageTexts) {
    const tx = item.x;
    const ty = item.y;
    const tw = item.width;
    const th = item.height;
    const tcy = ty + th / 2; // text center Y

    let score = Infinity;
    let zone: 'left' | 'above' | 'upper-left' | 'none' = 'none';

    // 1. LEFT ZONE
    // Text right edge lies to the left of the field left edge (with 5pt overlap tolerance)
    const rightEdge = tx + tw;
    if (rightEdge <= fx + 5 && tx < fx) {
      // Centers must be vertically aligned close to each other
      const verticalDiff = Math.abs(tcy - fcy);
      if (verticalDiff <= Math.max(fh, th) * 1.5) {
        zone = 'left';
        const dist = fx - rightEdge;
        score = dist + verticalDiff;
      }
    }

    // 2. ABOVE ZONE
    // Text bottom boundary lies above field top boundary (with 5pt tolerance)
    if (ty >= fy + fh - 5) {
      // Text start X should align closely or sit within field bounds
      const startAligned = tx >= fx - 50 && tx <= fx + fw;
      if (startAligned) {
        zone = 'above';
        const dist = ty - (fy + fh);
        const horizDiff = Math.abs(tx - fx);
        score = (dist + horizDiff) * 1.2; // 1.2 weighting factor
      }
    }

    // 3. UPPER-LEFT ZONE
    // Text is both above and to the left
    if (tx + tw <= fx + 5 && ty >= fy + fh - 5 && zone === 'none') {
      zone = 'upper-left';
      const dx = fx - (tx + tw);
      const dy = ty - (fy + fh);
      score = Math.sqrt(dx * dx + dy * dy) * 1.5; // 1.5 weighting factor
    }

    if (score < bestScore && score < maxDistance) {
      bestScore = score;
      bestLabel = item.text;
    }
  }

  if (bestLabel) {
    // Sanitize label formatting (trim spaces, strip trailing colons or empty checkboxes symbols)
    let sanitized = bestLabel.trim();
    sanitized = sanitized.replace(/^[:*\s]+/, ''); // leading colon/asterisk
    sanitized = sanitized.replace(/[:*\s]+$/, ''); // trailing colon/asterisk
    sanitized = sanitized.replace(/\[\s*\]/g, ''); // [ ]
    sanitized = sanitized.replace(/\(\s*\)/g, ''); // ( )
    sanitized = sanitized.trim();

    return sanitized.length > 0 ? sanitized : null;
  }

  return null;
}
