/**
 * FormatModal
 * ===========
 * Shown once when the LLM recommends a resume format different from the
 * user's current selection. The user can confirm or override.
 */
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { dismissFormatModal, setSelectedFormat } from '../../store/uiSlice';

export default function FormatModal() {
  const dispatch = useDispatch<AppDispatch>();
  const showModal = useSelector((s: RootState) => s.ui.showFormatModal);
  const selectedFormat = useSelector((s: RootState) => s.ui.selectedFormat);
  const analysisResult = useSelector((s: RootState) => s.analysis.result);

  if (!showModal || !analysisResult) return null;

  const { recommended_format, rationale, confidence } = analysisResult.format_recommendation;
  const pct = Math.round(confidence * 100);

  function confirm() {
    dispatch(setSelectedFormat(recommended_format));
    dispatch(dismissFormatModal());
  }

  function override() {
    // User wants to keep their current format — just close the modal
    dispatch(dismissFormatModal());
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Format Recommendation</h2>

        <div style={styles.badge}>
          {recommended_format === 'chronological' ? 'Chronological' : 'Combination'}
          <span style={styles.confidence}>{pct}% confidence</span>
        </div>

        <p style={styles.rationale}>{rationale}</p>

        <div style={styles.explainer}>
          <strong>Chronological</strong> — best when your career progression directly
          matches the role.<br />
          <strong>Combination</strong> — best when skills and competencies matter more
          than any single employer.
        </div>

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={confirm}>
            Use {recommended_format === 'chronological' ? 'Chronological' : 'Combination'}
          </button>
          <button style={styles.secondaryBtn} onClick={override}>
            Keep {selectedFormat === 'chronological' ? 'Chronological' : 'Combination'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '15px',
    padding: '6px 14px',
    borderRadius: '20px',
    marginBottom: '16px',
  },
  confidence: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#3b82f6',
    background: '#dbeafe',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  rationale: {
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 16px',
    fontSize: '14px',
  },
  explainer: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
  },
  primaryBtn: {
    flex: 1,
    padding: '11px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    padding: '11px',
    background: '#f1f5f9',
    color: '#374151',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  },
};
