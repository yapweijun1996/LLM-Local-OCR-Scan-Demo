import type { TableData } from '../types';

interface RawTable {
  header?: string[];
  rows?: Record<string, string>[];
}

export function postProcess(rawText: string): TableData {
  const parsed = extractFirstJSON(rawText);

  // Type guard: model may return null, array, or other shapes
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model output is not a JSON object — expected { header, rows }');
  }

  const json = parsed as RawTable;

  if (Array.isArray(json.rows) && json.rows.length > 0) {
    const keysFromRow = Object.keys(json.rows[0]);
    if (!json.header || json.header.length !== keysFromRow.length || json.header.some((h: string) => h.length < 2)) {
      json.header = keysFromRow;
    }
  }

  if (Array.isArray(json.rows)) {
    json.rows = json.rows.filter((r: Record<string, string>) => {
      if (!r.No || String(r.No).trim() === '') return false;
      const desc = String(r.Description || '').toLowerCase();
      if (/sub-?total|grand\s*total/.test(desc)) return false;
      return true;
    });
  }

  if (Array.isArray(json.rows)) json.rows.forEach((r: Record<string, string>) => {
    if (r.Description && !r.Description.includes('\n')) {
      r.Description = insertNewlineByPattern(r.Description);
    }
  });

  if (Array.isArray(json.rows)) json.rows.forEach((r: Record<string, string>) => {
    if (!r.Description) return;
    r.Description = r.Description
      .replace(/\bMicrowave Over\b/g, 'Microwave Oven')
      .replace(/\bPAN-ProJ-/g, 'PAN-PROJ-')
      .replace(/\baur ref:/gi, 'our ref:')
      .replace(/\bdelivry\b/gi, 'delivery');
  });

  // Normalize: guarantee TableData shape so callers can safely access .rows.length / .header.length
  return {
    header: Array.isArray(json.header) ? json.header : [],
    rows: Array.isArray(json.rows) ? json.rows : [],
  };
}

export function extractFirstJSON(text: string): unknown {
  const s = text.replace(/```json\s*|\s*```/g, '').trim();
  let depth = 0, start = -1, end = -1, inStr = false, esc = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }

  if (start === -1 || end === -1) throw new Error('No valid JSON found in model output');
  return JSON.parse(s.slice(start, end + 1));
}

function insertNewlineByPattern(desc: string): string {
  const patterns = [
    /\s+(office use)$/i,
    /\s+(delivery\s+\w+)$/i,
    /\s+(open-box)$/i,
    /\s+(meeting room)$/i,
    /\s+(data center)$/i,
    /\s+(3rd floor[^"]*)$/i,
    /\s+(our ref:\s*[A-Z-]+\d*)$/i,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m && m.index !== undefined) return desc.slice(0, m.index) + '\n' + m[1].trim();
  }
  return desc;
}
