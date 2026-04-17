import { useRef, useState, DragEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setResume, clearResume } from '../../store/resumeSlice';
import { clearAnalysis, startAnalysis } from '../../store/analysisSlice';
import {
  setParseLoading,
  setStep,
  setJobDescription,
} from '../../store/uiSlice';
import { parseResume, startAnalysis as apiStartAnalysis } from '../../api/client';

export default function UploadPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const parseLoading = useSelector((s: RootState) => s.ui.parseLoading);
  const jobDescription = useSelector((s: RootState) => s.ui.jobDescription);

  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file.');
      return;
    }
    setError(null);
    setFileName(file.name);
    setPendingFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function onSubmit() {
    if (!pendingFile) {
      setError('Please select a resume file.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste a job description.');
      return;
    }

    setError(null);
    dispatch(setParseLoading(true));
    dispatch(clearResume());
    dispatch(clearAnalysis());

    try {
      const { resume } = await parseResume(pendingFile);
      dispatch(setResume(resume));

      // Kick off analysis in the background before transitioning
      try {
        const { task_id } = await apiStartAnalysis({
          resume,
          job_description: jobDescription,
        });
        dispatch(startAnalysis(task_id));
      } catch {
        // Non-fatal: workspace is still usable without analysis results
      }

      dispatch(setStep('workspace'));
    } catch (err: any) {
      setError(err.message ?? 'Failed to parse resume.');
    } finally {
      dispatch(setParseLoading(false));
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Resume Optimizer</h1>
        <p style={styles.subtitle}>
          Upload your master resume and paste a job description. We'll tailor
          it to fit one page.
        </p>

        {/* Drop zone */}
        <div
          style={{
            ...styles.dropZone,
            ...(dragOver ? styles.dropZoneActive : {}),
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {fileName ? (
            <span style={styles.fileName}>📄 {fileName}</span>
          ) : (
            <span style={styles.dropText}>
              Drop your <strong>.docx</strong> resume here, or click to browse
            </span>
          )}
        </div>

        {/* Job description */}
        <label style={styles.label}>Job Description</label>
        <textarea
          style={styles.textarea}
          placeholder="Paste the full job description here…"
          value={jobDescription}
          onChange={e => dispatch(setJobDescription(e.target.value))}
          rows={10}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{
            ...styles.button,
            ...(parseLoading ? styles.buttonDisabled : {}),
          }}
          onClick={onSubmit}
          disabled={parseLoading}
        >
          {parseLoading ? 'Uploading…' : 'Optimize Resume →'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '40px',
    width: '100%',
    maxWidth: '600px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '0 0 28px',
    color: '#64748b',
    lineHeight: 1.5,
  },
  dropZone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'border-color 0.15s, background 0.15s',
    background: '#f8fafc',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
  },
  dropText: {
    color: '#64748b',
    fontSize: '15px',
  },
  fileName: {
    color: '#1d4ed8',
    fontWeight: 500,
    fontSize: '15px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    color: '#0f172a',
    boxSizing: 'border-box',
    lineHeight: 1.5,
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '8px',
  },
  button: {
    marginTop: '20px',
    width: '100%',
    padding: '13px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
  },
};
