import type { TableData } from '../types';

let _idCounter = 0;
export const nextId = () => `f${++_idCounter}`;

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function exportFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCSV(data: TableData): string {
  const esc = (v: string) => {
    const s = String(v || '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [data.header.map(esc).join(',')];
  data.rows.forEach(r => lines.push(data.header.map(c => esc(r[c] ?? '')).join(',')));
  return lines.join('\n');
}

export function toMarkdown(data: TableData): string {
  const lines = ['| ' + data.header.join(' | ') + ' |'];
  lines.push('| ' + data.header.map(() => '---').join(' | ') + ' |');
  data.rows.forEach(r => {
    lines.push('| ' + data.header.map(c => String(r[c] || '').replace(/\n/g, '<br>')).join(' | ') + ' |');
  });
  return lines.join('\n');
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
