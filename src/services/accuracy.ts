import type { TableData, MathIssue, AccuracyResult } from '../types';

const MATH_TOLERANCE = 0.01;

export function validateMath(rows: Record<string, string>[]): MathIssue[] {
  const issues: MathIssue[] = [];
  rows.forEach(r => {
    const q = num(r.Qty), p = num(r['Unit Price']), t = num(r.Total);
    if (Number.isNaN(q) || Number.isNaN(p) || Number.isNaN(t)) return;
    const calc = +(q * p).toFixed(2);
    if (Math.abs(calc - t) > MATH_TOLERANCE) {
      issues.push({
        no: r.No,
        msg: `${q} × ${p} = ${calc.toFixed(2)} but Total reads ${t.toFixed(2)}. Suggested Unit Price: ${(t / q).toFixed(2)}`,
        suggestedPrice: +(t / q).toFixed(2),
      });
    }
  });
  return issues;
}

export function computeAccuracy(actual: TableData, truth: TableData): AccuracyResult {
  const cols = truth.header;
  const truthByNo = Object.fromEntries(truth.rows.map(r => [r.No, r]));

  const rowsExpected = truth.rows.length;
  const rowsGot = actual.rows.length;

  let cellsTotal = 0, cellsMatched = 0;
  const perRow = truth.rows.map(tRow => {
    const aRow = actual.rows.find(r => String(r.No) === String(tRow.No));
    const rowResult = { no: tRow.No, missing: !aRow, cells: {} as Record<string, { match: boolean; expected: string; actual: string | null }> };

    cols.forEach(col => {
      cellsTotal++;
      if (!aRow) {
        rowResult.cells[col] = { match: false, expected: tRow[col] ?? '', actual: null };
        return;
      }
      const eVal = (tRow[col] ?? '').toString();
      const aVal = (aRow[col] ?? '').toString();
      const match = normalize(eVal) === normalize(aVal);
      if (match) cellsMatched++;
      rowResult.cells[col] = { match, expected: eVal, actual: aVal };
    });

    return rowResult;
  });

  const extraRows = actual.rows.filter(r => !truthByNo[r.No]).length;
  const overallPct = cellsTotal ? Math.round((cellsMatched / cellsTotal) * 1000) / 10 : 0;
  const rowMatchPct = rowsExpected ? Math.round((Math.min(rowsGot, rowsExpected) / rowsExpected) * 1000) / 10 : 0;

  return { rowsExpected, rowsGot, extraRows, cellsTotal, cellsMatched, overallPct, rowMatchPct, perRow };
}

function num(v: string | undefined): number {
  if (v == null) return NaN;
  return Number(String(v).replace(/,/g, ''));
}

function normalize(s: string): string {
  return String(s).replace(/\s+/g, ' ').replace(/[—–-]+/g, '-').trim().toLowerCase();
}
