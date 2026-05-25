import './styles/global.css';
import { useEffect, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import s from './App.module.css';
import Masthead from './components/Masthead/Masthead';
import ComplianceBar from './components/ComplianceBar/ComplianceBar';
import Hero from './components/Hero/Hero';
import StepIndicator from './components/StepIndicator/StepIndicator';
import AdminPanel from './components/AdminPanel/AdminPanel';
import ProviderConfig from './components/ProviderConfig/ProviderConfig';
import UploadPanel from './components/UploadPanel/UploadPanel';
import ExtractionPanel from './components/ExtractionPanel/ExtractionPanel';
import ResultsPanel from './components/ResultsPanel/ResultsPanel';
import Footer from './components/Footer/Footer';
import { PROVIDERS } from './config/providers';
import { clearHistoryRecords, listHistoryRecords, saveHistoryRecord } from './services/historyDb';
import type { ExtractionResult, HistoryRecord } from './types';

export default function App() {
  const { state, setProvider, setConfig, addFile, restoreHistory, removeFile, setActiveFile, setResult, setRunning, setStep } = useAppState();
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const activeResult = state.activeFileId ? state.results[state.activeFileId] ?? null : null;
  const activeFile = state.files.find(f => f.id === state.activeFileId);

  useEffect(() => {
    let cancelled = false;
    listHistoryRecords()
      .then(records => {
        if (!cancelled) setHistory(records);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSetResult(fileId: string, result: ExtractionResult) {
    setResult(fileId, result);

    const file = state.files.find(entry => entry.id === fileId);
    if (!file) return;

    const record: HistoryRecord = {
      id: `${Date.now()}-${fileId}`,
      fileName: file.name,
      provider: state.provider,
      providerName: PROVIDERS[state.provider].name,
      modelName: state.config.model,
      createdAt: new Date().toISOString(),
      isBenchmark: file.isBenchmark,
      result,
      base64: file.base64 || undefined,  // persist image so thumbnail shows on restore
      mimeType: file.mimeType,           // persist MIME so restored image renders / re-extracts correctly
    };

    await saveHistoryRecord(record);
    setHistory(await listHistoryRecords());
  }

  function handleRestoreHistory(record: HistoryRecord) {
    restoreHistory(
      {
        id: `history-${record.id}-${Date.now()}`,
        name: record.fileName,
        base64: record.base64 ?? '',   // empty string → ExtractionPanel skips re-running; UI shows History placeholder
        mimeType: record.mimeType,
        isBenchmark: record.isBenchmark,
        fromHistory: true,
      },
      record.result,
    );
  }

  async function handleClearHistory() {
    await clearHistoryRecords();
    setHistory([]);
  }

  return (
    <div className={s.appShell}>
      <Masthead />
      <ComplianceBar />
      <Hero />

      <div className={s.workspace}>
        <AdminPanel
          state={state}
          history={history}
          onRestoreHistory={handleRestoreHistory}
          onClearHistory={handleClearHistory}
        />

        <main className={s.mainFlow}>
          <StepIndicator current={state.step} />

          <ProviderConfig
            provider={state.provider}
            config={state.config}
            onProviderChange={setProvider}
            onConfigChange={setConfig}
          />

          <UploadPanel
            files={state.files}
            activeFileId={state.activeFileId}
            onAddFile={addFile}
            onRemoveFile={removeFile}
            onSetActive={setActiveFile}
          />

          <ExtractionPanel
            state={state}
            onSetRunning={setRunning}
            onSetResult={handleSetResult}
            onSetStep={setStep}
          />

          <ResultsPanel
            result={activeResult}
            activeFileName={activeFile?.name ?? ''}
            provider={state.provider}
            modelName={state.config.model}
          />
        </main>
      </div>

      <Footer />
    </div>
  );
}
