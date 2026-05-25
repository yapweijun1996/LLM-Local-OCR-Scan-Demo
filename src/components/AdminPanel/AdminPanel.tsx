import type { AppState, HistoryRecord } from '../../types';
import { PROVIDERS } from '../../config/providers';
import s from './AdminPanel.module.css';

interface Props {
  state: AppState;
  history: HistoryRecord[];
  onRestoreHistory: (record: HistoryRecord) => void;
  onClearHistory: () => void;
}

const NAV_ITEMS = [
  { href: '#panel-1', label: 'Provider' },
  { href: '#panel-2', label: 'Documents' },
  { href: '#panel-3', label: 'Extraction' },
  { href: '#panel-4', label: 'Results' },
];

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'Custom endpoint';
  }
}

function formatRecordDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminPanel({ state, history, onRestoreHistory, onClearHistory }: Props) {
  const provider = PROVIDERS[state.provider];
  const activeFile = state.files.find(file => file.id === state.activeFileId);
  const completed = Object.keys(state.results).length;
  const failed = Object.values(state.results).filter(result => result.error).length;
  const benchmarkCount = state.files.filter(file => file.isBenchmark).length;
  const status = state.running ? 'Running' : completed > 0 ? 'Ready to review' : 'Idle';

  return (
    <aside className={s.panel} aria-label="Admin control panel">
      <div className={s.header}>
        <div>
          <div className={s.eyebrow}>Admin</div>
          <h2>Control Center</h2>
        </div>
        <span className={`${s.statusDot} ${state.running ? s.statusLive : ''}`} aria-hidden="true" />
      </div>

      <div className={s.statusBlock}>
        <div className={s.statusLabel}>Workflow Status</div>
        <div className={s.statusValue}>{status}</div>
        <div className={s.statusHint}>
          {state.files.length === 0
            ? 'Stage a document to begin.'
            : `${completed}/${state.files.length} file(s) processed.`}
        </div>
      </div>

      <dl className={s.metrics}>
        <div>
          <dt>Queue</dt>
          <dd>{state.files.length}</dd>
        </div>
        <div>
          <dt>Done</dt>
          <dd>{completed}</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd className={failed > 0 ? s.danger : ''}>{failed}</dd>
        </div>
      </dl>

      <div className={s.section}>
        <div className={s.sectionTitle}>Provider</div>
        <div className={s.infoRow}>
          <span>Engine</span>
          <strong>{provider.name}</strong>
        </div>
        <div className={s.infoRow}>
          <span>Model</span>
          <strong>{state.config.model || 'Unset'}</strong>
        </div>
        <div className={s.infoRow}>
          <span>Endpoint</span>
          <strong>{endpointHost(state.config.endpoint)}</strong>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Privacy Posture</div>
        <div className={`${s.privacyPill} ${provider.needsKey ? s.cloud : s.local}`}>
          {provider.needsKey ? 'Cloud API mode' : 'Local-first mode'}
        </div>
        <p className={s.note}>
          {provider.needsKey
            ? 'Documents are sent to the configured provider endpoint.'
            : 'Documents stay on this machine when LM Studio is reachable.'}
        </p>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Active Document</div>
        <div className={s.fileName}>{activeFile?.name ?? 'No document selected'}</div>
        <div className={s.note}>
          {activeFile?.fromHistory
            ? 'Restored from local history.'
            : benchmarkCount > 0 ? `${benchmarkCount} benchmark sample staged.` : 'No benchmark sample staged.'}
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <div>
            <div className={s.sectionTitle}>Local History</div>
            <p className={s.note}>{history.length} saved result{history.length === 1 ? '' : 's'} on this device.</p>
          </div>
          <button className={s.textButton} type="button" disabled={history.length === 0} onClick={onClearHistory}>
            Clear
          </button>
        </div>

        <div className={s.historyList}>
          {history.length === 0 && <div className={s.emptyHistory}>No saved extractions yet.</div>}
          {history.slice(0, 4).map(record => (
            <button
              key={record.id}
              className={s.historyItem}
              type="button"
              onClick={() => onRestoreHistory(record)}
            >
              <span className={s.historyName}>{record.fileName}</span>
              <span className={s.historyMeta}>
                {formatRecordDate(record.createdAt)} · {record.providerName}
              </span>
              <span className={s.historyScore}>
                {record.result.accuracy ? `${record.result.accuracy.overallPct}%` : record.result.error ? 'Error' : 'Saved'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <nav className={s.nav} aria-label="Workflow shortcuts">
        {NAV_ITEMS.map(item => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </nav>
    </aside>
  );
}
