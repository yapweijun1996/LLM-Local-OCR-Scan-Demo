import { Fragment, useState } from 'react';
import type { ExtractionResult, AccuracyResult, TableData, MathIssue } from '../../types';
import { PROVIDERS } from '../../config/providers';
import { exportFile, toCSV, toMarkdown } from '../../services/fileUtils';
import type { Provider } from '../../types';
import s from './ResultsPanel.module.css';

interface Props {
  result: ExtractionResult | null;
  activeFileName: string;
  provider: Provider;
  modelName: string;
}

type TabId = 'table' | 'json' | 'diff' | 'raw';

function AccuracyCard({ result, activeFileName, provider, modelName }: Props) {
  const r = result!;
  const a = r.accuracy;

  if (a) {
    const grade = a.overallPct >= 95 ? s.good : a.overallPct >= 85 ? s.warn : s.bad;
    return (
      <div className={s.accuracyCard}>
        <div>
          <div className={s.accTitle}>Benchmark Result</div>
          <div className={s.accName}>{modelName} · {PROVIDERS[provider].name}</div>
          <div className={s.accGrid}>
            <StatCell label="Rows Match" value={`${a.rowsGot}/${a.rowsExpected}`} cls={a.rowsGot === a.rowsExpected ? s.good : s.warn} />
            <StatCell label="Cells Match" value={`${a.cellsMatched}/${a.cellsTotal}`} cls={grade} />
            <StatCell label="Math Pass" value={`${r.cleaned!.rows.length - r.issues.length}/${r.cleaned!.rows.length}`} cls={r.issues.length === 0 ? s.good : s.bad} />
            <StatCell label="Extra Rows" value={String(a.extraRows)} cls={a.extraRows === 0 ? s.good : s.bad} />
          </div>
        </div>
        <div className={s.accOverall}>
          <div className={s.accPercent}>{a.overallPct}%</div>
          <div className={s.accPercentLabel}>Overall Accuracy</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.accuracyCard}>
      <div>
        <div className={s.accTitle}>Extraction Summary</div>
        <div className={s.accName}>{activeFileName}</div>
        <div className={s.accGrid}>
          <StatCell label="Rows Extracted" value={String(r.cleaned!.rows.length)} cls={s.good} />
          <StatCell label="Math Pass" value={`${r.cleaned!.rows.length - r.issues.length}/${r.cleaned!.rows.length}`} cls={r.issues.length === 0 ? s.good : s.warn} />
          <StatCell label="Engine" value={PROVIDERS[provider].name} sm />
          <StatCell label="Latency" value="Local" sm />
        </div>
      </div>
      <div className={s.accOverall}>
        <div className={`${s.accPercent} ${s.accPercentSm}`}>{r.issues.length === 0 ? '✓' : '!'}</div>
        <div className={s.accPercentLabel}>{r.issues.length === 0 ? 'Validated' : 'Review Required'}</div>
      </div>
    </div>
  );
}

function StatCell({ label, value, cls = '', sm = false }: { label: string; value: string; cls?: string; sm?: boolean }) {
  return (
    <div className={s.accStat}>
      <div className={s.accLabel}>{label}</div>
      <div className={`${s.accValue} ${cls} ${sm ? s.accValueSm : ''}`}>{value}</div>
    </div>
  );
}

function TableView({ cleaned, issues }: { cleaned: TableData; issues: MathIssue[] }) {
  const issuesByNo = Object.fromEntries(issues.map(i => [i.no, i]));
  return (
    <div className={s.resultsTable}>
      <table>
        <thead>
          <tr>
            {cleaned.header.map(c => <th key={c}>{c}</th>)}
            <th style={{ textAlign: 'center' }}>Check</th>
          </tr>
        </thead>
        <tbody>
          {cleaned.rows.map((row, ri) => {
            const issue = issuesByNo[row.No];
            return (
              <Fragment key={`${row.No || 'row'}-${ri}`}>
                <tr className={issue ? s.rowWarn : s.rowOk}>
                  {cleaned.header.map((col, idx) => (
                    <td key={col} className={`${idx >= 2 ? s.colMoney : ''} ${idx === 0 ? s.colNum : ''}`}>
                      {row[col] || ''}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`${s.check} ${issue ? s.checkBad : s.checkOk}`}>{issue ? '!' : '✓'}</span>
                  </td>
                </tr>
                {issue && (
                  <tr key={`${ri}-issue`} className={s.rowWarn}>
                    <td colSpan={cleaned.header.length + 1} className={s.rowIssue}>
                      ↳ {issue.msg}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DiffView({ accuracy }: { accuracy: AccuracyResult }) {
  const mismatches = accuracy.perRow.flatMap(rowR =>
    Object.entries(rowR.cells)
      .filter(([, cell]) => !cell.match)
      .map(([col, cell]) => ({ no: rowR.no, col, cell }))
  );

  if (mismatches.length === 0) {
    return <div className={s.diffAllMatch}>All cells matched ground truth. ✓</div>;
  }

  return (
    <div className={s.resultsTable}>
      <table>
        <thead>
          <tr>
            <th>No</th><th>Column</th><th>Expected</th><th>Got</th><th style={{ textAlign: 'center' }}>Match</th>
          </tr>
        </thead>
        <tbody>
          {mismatches.map(({ no, col, cell }, i) => (
            <tr key={i} className={s.rowBad}>
              <td className={s.colNum}>{no}</td>
              <td><strong>{col}</strong></td>
              <td><code className={s.codeInline}>{cell.expected}</code></td>
              <td><code className={s.codeMismatch}>{cell.actual ?? '(missing)'}</code></td>
              <td style={{ textAlign: 'center' }}>
                <span className={`${s.check} ${s.checkBad}`}>✗</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultsPanel({ result, activeFileName, provider, modelName }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('table');

  const renderContent = () => {
    if (!result) {
      return <div className={s.emptyState}>Run extraction to see results here.</div>;
    }
    if (result.error) {
      return <div className={`${s.emptyState} ${s.emptyError}`}>⚠ {result.error}</div>;
    }
    return null;
  };

  const content = renderContent();

  return (
    <section className={s.panel} id="panel-4">
      <span className={s.panelNum}>— Step 04 —</span>
      <h2 className={s.panelTitle}>Verify and export</h2>
      <div className={s.panelDesc}>Review math checks, inspect benchmark differences, and export the cleaned table.</div>

      {content ? content : (
        <>
          <AccuracyCard result={result} activeFileName={activeFileName} provider={provider} modelName={modelName} />

          <div className={s.tabs}>
            {(['table', 'json', 'diff', 'raw'] as TabId[]).map(tab => (
              <button
                key={tab}
                className={`${s.tabBtn} ${activeTab === tab ? s.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'table' ? 'Structured Table' : tab === 'json' ? 'JSON Output' : tab === 'diff' ? 'Cell-by-Cell Diff' : 'Raw Model Output'}
              </button>
            ))}
          </div>

          <div className={activeTab === 'table' ? s.tabContentActive : s.tabContent}>
            <TableView cleaned={result!.cleaned!} issues={result!.issues} />
          </div>
          <div className={activeTab === 'json' ? s.tabContentActive : s.tabContent}>
            <div className={s.jsonOutput}>{JSON.stringify(result!.cleaned, null, 2)}</div>
          </div>
          <div className={activeTab === 'diff' ? s.tabContentActive : s.tabContent}>
            {result!.accuracy
              ? <DiffView accuracy={result!.accuracy} />
              : <div className={s.emptyState}>Diff is only available for benchmark samples.</div>}
          </div>
          <div className={activeTab === 'raw' ? s.tabContentActive : s.tabContent}>
            <div className={s.jsonOutput}>{result!.raw || ''}</div>
          </div>

          <div className={s.exportBar}>
            <span className={s.exportLabel}>Export Cleaned Output</span>
            <button className={s.btnGhost} onClick={() => exportFile(JSON.stringify(result!.cleaned, null, 2), 'extracted.json', 'application/json')}>JSON</button>
            <button className={s.btnGhost} onClick={() => exportFile(toCSV(result!.cleaned!), 'extracted.csv', 'text/csv')}>CSV</button>
            <button className={s.btnGhost} onClick={() => exportFile(toMarkdown(result!.cleaned!), 'extracted.md', 'text/markdown')}>Markdown</button>
          </div>
        </>
      )}
    </section>
  );
}
