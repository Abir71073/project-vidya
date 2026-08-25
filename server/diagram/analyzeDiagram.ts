import { GoogleGenAI } from '@google/genai';
import { DiagramAnalysis, DiagramEntity } from './types';

/**
 * Detects distinct labeled entities (circuit components, geometry points/segments,
 * etc.) in an uploaded diagram image, with normalized bounding boxes so the UI can
 * overlay tappable regions. This is a first version: LLM-estimated bounding boxes
 * are approximate, not pixel-precise — good enough for "tap near this gate", not
 * for CAD-grade precision. Coverage is whatever Gemini's vision model can reliably
 * separate into distinct components; dense/overlapping diagrams may come back with
 * confident:false, and callers must fall back to a plain free-text follow-up box.
 */
export async function analyzeDiagram(imageBase64: string): Promise<DiagramAnalysis> {
  const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    return { confident: false, entities: [] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        text: `Analyze this image, which may be a circuit diagram, geometry figure, graph, or other technical diagram (or it may just be a plain math/text problem with no diagram at all).

If it contains a diagram with distinct, individually identifiable components (e.g. separate logic gates, resistors/capacitors/other circuit elements, labeled points/angles/segments in a geometry figure), identify each one with:
- "label": a short human-readable name (e.g. "AND gate 1", "Resistor R1", "Point A", "Angle BAC")
- "box": a bounding box tightly enclosing just that entity, using your standard 0-1000 normalized coordinate grid (the same convention you use for object detection) — "x" and "y" are the top-left corner (0-1000, where 1000 = the full image width for x and the full image height for y), "width" and "height" are also on that same 0-1000 scale.

Set "confident" to true only if you can identify at least 2 distinct entities with genuinely separable, non-overlapping bounding boxes. If the image has no diagram, or the components are too dense/overlapping/ambiguous to box individually, set "confident" to false and return an empty "entities" array — do not guess approximate boxes in that case.

Return ONLY valid JSON with this exact structure, no prose outside the JSON:
{ "confident": true, "entities": [ { "label": "...", "box": { "x": 100, "y": 200, "width": 150, "height": 100 } } ] }`,
      },
      { inlineData: { mimeType: match[1], data: match[2] } },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const raw = response.text || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { confident: false, entities: [] };
  }

  const rawEntities: any[] = Array.isArray(parsed.entities) ? parsed.entities : [];
  const entities: DiagramEntity[] = rawEntities
    .map((e: any, i: number) => {
      // Gemini's vision grounding always returns coordinates on its trained
      // 0-1000 grid regardless of how the prompt phrases it — dividing by 1000
      // here converts that to the 0-1 fractions the frontend needs for CSS %.
      const box = e?.box || {};
      const x = Number(box.x) / 1000;
      const y = Number(box.y) / 1000;
      const width = Number(box.width) / 1000;
      const height = Number(box.height) / 1000;
      return {
        id: `e${i + 1}`,
        label: String(e?.label || `Component ${i + 1}`).trim(),
        box: { x, y, width, height },
      };
    })
    // Reject anything that isn't a sane normalized box — protects the UI from
    // rendering garbage overlays if the model returns out-of-range numbers.
    .filter((e) =>
      e.label &&
      [e.box.x, e.box.y, e.box.width, e.box.height].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) &&
      e.box.width > 0 && e.box.height > 0 &&
      e.box.x + e.box.width <= 1.01 && e.box.y + e.box.height <= 1.01
    );

  const confident = Boolean(parsed.confident) && entities.length >= 2;

  return { confident, entities: confident ? entities : [] };
}
