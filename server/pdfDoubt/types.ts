export interface DetectedQuestion {
  id: string;
  /** Short label for the picker UI, in the same language as the question. */
  title: string;
  /** Full verbatim question text (all sub-parts included, not split further). */
  text: string;
}

export interface PdfParseResult {
  questions: DetectedQuestion[];
  /** True if pdf-parse's text layer was too sparse and page-image OCR was used instead. */
  usedImageFallback: boolean;
  pageCount: number;
}
