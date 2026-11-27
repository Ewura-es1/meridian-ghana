import mammoth from 'mammoth';

export async function extractDocumentText(buffer: Buffer, ext: '.pdf' | '.docx'): Promise<string> {
  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      return text || '[DOCX uploaded successfully. No plain text paragraphs were detected.]';
    } catch {
      return '[DOCX uploaded successfully. Text preview could not be parsed automatically.]';
    }
  }

  // PDF text extraction using pdf-parse with safe dynamic resolution
  try {
    const pdfModule: any = await import('pdf-parse');
    if (typeof pdfModule?.PDFParse === 'function') {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const parsed = await parser.getText();
      const text = (parsed?.text || '').trim();
      return text || '[PDF uploaded successfully. This PDF appears to be scanned or image-based; editors can download the private PDF directly to review.]';
    }
    const parseFn = typeof pdfModule?.default === 'function' ? pdfModule.default : pdfModule;
    if (typeof parseFn === 'function') {
      const parsed = await parseFn(buffer);
      const text = (parsed?.text || '').trim();
      return text || '[PDF uploaded successfully. No extractable text layer found; editors can download the private PDF directly to review.]';
    }
  } catch {
    // Graceful fallback if PDF uses custom encoding
  }

  return '[PDF uploaded successfully. Automatic text extraction was unavailable for this file; authorized reviewers can download the private PDF directly.]';
}
