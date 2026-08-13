import {
  getDocument,
  GlobalWorkerOptions,
  PasswordException,
} from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// Keep the worker in-browser so the PDF never leaves the device
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export class PdfPasswordError extends Error {
  constructor(message = "Incorrect or missing PDF password.") {
    super(message);
    this.name = "PdfPasswordError";
  }
}

/**
 * Extract plain text from a PDF in the browser.
 * Supports password-protected files via pdf.js.
 */
export async function extractPdfText(
  file: File,
  password = "",
): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());

  let pdf;
  try {
    pdf = await getDocument({
      data,
      password: password || undefined,
    }).promise;
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfPasswordError();
    }
    throw error;
  }

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = buildTextLines(content.items);
      pages.push(`--- Page ${pageNumber} ---\n${lines.join("\n")}`);
    }

    return pages.join("\n\n").trim();
  } finally {
    await pdf.cleanup();
    await pdf.loadingTask.destroy();
  }
}

type PositionedItem = {
  str: string;
  x: number;
  y: number;
};

/**
 * Turn pdf.js text items into readable lines using their viewport positions.
 */
function buildTextLines(items: Array<unknown>): string[] {
  const positioned: PositionedItem[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) {
      continue;
    }

    const textItem = item as TextItem;
    if (!textItem.str) {
      continue;
    }

    const transform = textItem.transform;
    positioned.push({
      str: textItem.str,
      x: transform[4],
      y: Math.round(transform[5]),
    });
  }

  // Top-to-bottom, then left-to-right within the same visual line
  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentParts: string[] = [];

  const flush = () => {
    const line = currentParts.join("").replace(/[ \t]+/g, " ").trim();
    if (line) {
      lines.push(line);
    }
    currentParts = [];
  };

  for (const item of positioned) {
    if (currentY === null) {
      currentY = item.y;
    }

    // Items within a few units share the same line
    if (Math.abs(item.y - currentY) > 2) {
      flush();
      currentY = item.y;
    }

    currentParts.push(item.str);
  }

  flush();
  return lines;
}
