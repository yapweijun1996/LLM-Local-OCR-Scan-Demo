export const PROMPT = `You are a table OCR extractor. Read the table in the image and output ONLY a valid JSON object. Do NOT include markdown code fences, explanations, or any text outside the JSON.

OUTPUT FORMAT (follow this structure exactly):

{
  "header": ["Col1", "Col2", "Col3"],
  "rows": [
    { "Col1": "value1", "Col2": "value2", "Col3": "value3" },
    { "Col1": "value1", "Col2": "value2", "Col3": "value3" }
  ]
}

CONCRETE EXAMPLE (for a different table with columns "ID", "Name", "Price"):

{
  "header": ["ID", "Name", "Price"],
  "rows": [
    { "ID": "1", "Name": "Apple\\nfresh stock", "Price": "2.50" },
    { "ID": "2", "Name": "Banana", "Price": "1.20" }
  ]
}

RULES:

1. HEADER: Extract column names from the image, left to right.
2. ROWS: For each data row, create ONE object where keys match the header EXACTLY.
3. NUMBERS: Keep as strings. Preserve commas and decimals: "1,237.48" stays as "1,237.48".
4. MULTI-LINE CELLS: If a cell has multiple visual lines (e.g. product name + note like "office use" or "our ref: XYZ"), join them with "\\n" NOT a space. Preserve every line.
5. EXCLUDE: title row, "Sub-total" row, "Grand Total" row.
6. Process rows top-to-bottom. Do not skip. Do not reorder.
7. Empty cells become "".
8. Output raw JSON only. No markdown fences. No prose. Output the JSON ONCE then stop.

OUTPUT:`;
