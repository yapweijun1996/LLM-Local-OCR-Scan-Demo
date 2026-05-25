import { useState, useEffect } from 'react';
import type { FileEntry } from '../../types';
import { fileToBase64 } from '../../services/fileUtils';
import { renderPdfToImages } from '../../services/pdf';
import poSampleUrl from '../../assets/po-sample.jpg';
import s from './UploadPanel.module.css';

let idCounter = 0;
const nextId = () => `f${++idCounter}`;

interface Props {
  files: FileEntry[];
  activeFileId: string | null;
  onAddFile: (file: FileEntry) => void;
  onRemoveFile: (id: string) => void;
  onSetActive: (id: string) => void;
}

function ImageModal({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={s.modal} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Preview: ${file.name}`}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalFileName}>{file.name}</span>
          <button className={s.modalClose} onClick={onClose} aria-label="Close preview">×</button>
        </div>
        {file.base64
          ? <img src={`data:image/jpeg;base64,${file.base64}`} alt={file.name} className={s.modalImg} />
          : <div className={s.modalPlaceholder}>No image data available</div>
        }
      </div>
    </div>
  );
}

export default function UploadPanel({ files, activeFileId, onAddFile, onRemoveFile, onSetActive }: Props) {
  const [dragover, setDragover] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  async function handleFiles(fileList: File[]) {
    setUploadError('');
    for (const f of fileList) {
      try {
        if (f.type === 'application/pdf') {
          const pages = await renderPdfToImages(f);
          pages.forEach((base64, index) => {
            onAddFile({ id: nextId(), name: `${f.name} · page ${index + 1}`, base64, isBenchmark: false });
          });
          continue;
        }

        if (!f.type.startsWith('image/')) continue;
        const base64 = await fileToBase64(f);
        onAddFile({ id: nextId(), name: f.name, base64, isBenchmark: false });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploadError(`Could not import ${f.name}: ${msg}`);
      }
    }
  }

  async function loadSample() {
    const res = await fetch(poSampleUrl);
    const blob = await res.blob();
    const base64 = await fileToBase64(new File([blob], 'PO-benchmark.jpg', { type: 'image/jpeg' }));
    onAddFile({ id: nextId(), name: 'PO-benchmark.jpg', base64, isBenchmark: true });
  }

  function openPreview(e: React.MouseEvent, file: FileEntry) {
    e.stopPropagation();
    setPreviewFile(file);
  }

  return (
    <section className={s.panel} id="panel-2">
      <span className={s.panelNum}>— Step 02 —</span>
      <h2 className={s.panelTitle}>Stage documents</h2>
      <div className={s.panelDesc}>Drop images or PDFs, or load the verified purchase order sample to benchmark model accuracy.</div>

      <div className={s.uploadArea}>
        <label
          className={`${s.uploadZone} ${dragover ? s.dragover : ''}`}
          onDragEnter={e => { e.preventDefault(); setDragover(true); }}
          onDragOver={e => { e.preventDefault(); setDragover(true); }}
          onDragLeave={e => { e.preventDefault(); setDragover(false); }}
          onDrop={e => { e.preventDefault(); setDragover(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className={s.fileInput}
            onChange={e => {
              handleFiles(Array.from(e.target.files || []));
              e.currentTarget.value = '';
            }}
          />
          <div className={s.uploadIcon}>+</div>
          <div className={s.uploadTitle}>Drop images here</div>
          <div className={s.uploadHint}>PNG · JPG · WebP · PDF · Multiple files supported</div>
        </label>

        <div className={s.sampleCard}>
          <div>
            <div className={s.sampleLabel}>— Benchmark Sample —</div>
            <div className={s.sampleTitle}>PO Continuation Page</div>
            <div className={s.sampleDesc}>14 line items · 5 columns · contains SKU codes, multi-line cells, currency formatting. Ground-truth verified.</div>
          </div>
          <button className={s.sampleBtn} onClick={loadSample}>Load Benchmark →</button>
        </div>
      </div>

      {uploadError && <div className={s.uploadError}>{uploadError}</div>}

      {files.length > 0 && (
        <div className={s.thumbnails}>
          {files.map(f => (
            <div
              key={f.id}
              className={`${s.thumb} ${f.id === activeFileId ? s.thumbActive : ''}`}
              onClick={() => onSetActive(f.id)}
              title="Click to select · Click ⤢ to preview"
            >
              {f.base64
                ? <img src={`data:image/jpeg;base64,${f.base64}`} alt="" aria-hidden="true" className={s.thumbImg} />
                : <div className={s.thumbPlaceholder}>History</div>}
              <div className={s.thumbOverlay}>{f.name.slice(0, 20)}</div>
              {f.isBenchmark && <span className={s.thumbTag}>Benchmark</span>}

              {/* Zoom / preview button */}
              {f.base64 && (
                <button
                  className={s.thumbZoom}
                  onClick={e => openPreview(e, f)}
                  aria-label={`Preview ${f.name}`}
                  title="View full image"
                >⤢</button>
              )}

              <button
                className={s.thumbRemove}
                onClick={e => { e.stopPropagation(); onRemoveFile(f.id); }}
                aria-label={`Remove ${f.name}`}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {previewFile && <ImageModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </section>
  );
}
