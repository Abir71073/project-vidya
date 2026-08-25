export interface DiagramEntity {
  id: string;
  /** Short label for this component, e.g. "AND gate 1", "Resistor R1", "Point A". */
  label: string;
  /** Normalized bounding box (0-1 fractions of image width/height), top-left origin. */
  box: { x: number; y: number; width: number; height: number };
}

export interface DiagramAnalysis {
  /** False when the image isn't a diagram, or entities can't be boxed reliably — callers should fall back to free-text. */
  confident: boolean;
  entities: DiagramEntity[];
}
