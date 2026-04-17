/**
 * AnalysisBanner
 * ==============
 * Thin status bar shown below the toolbar while the LLM analysis is running
 * or has completed. Hidden when status is idle.
 */
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export default function AnalysisBanner() {
  const status = useSelector((s: RootState) => s.analysis.status);
  const result = useSelector((s: RootState) => s.analysis.result);
  const error = useSelector((s: RootState) => s.analysis.errorMessage);

  if (status === 'idle') return null;

  if (status === 'pending') {
    return (
      <div style={{ ...styles.banner, background: '#eff6ff', borderColor: '#bfdbfe' }}>
        <span style={styles.spinner} />
        <span style={{ color: '#1d4ed8', fontSize: '13px' }}>
          Analysing resume against job description…
        </span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...styles.banner, background: '#fef2f2', borderColor: '#fecaca' }}>
        <span style={{ color: '#dc2626', fontSize: '13px' }}>
          Analysis failed: {error ?? 'Unknown error'}
        </span>
      </div>
    );
  }

  // complete
  if (!result) return null;
  const pct = Math.round(result.overall_match_score * 100);
  const matched = Object.values(result.ats_keyword_coverage).filter(Boolean).length;
  const total = Object.keys(result.ats_keyword_coverage).length;

  return (
    <div style={{ ...styles.banner, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
      <span style={{ color: '#15803d', fontWeight: 600, fontSize: '13px' }}>
        Match score: {pct}%
      </span>
      <span style={styles.dot} />
      <span style={{ color: '#166534', fontSize: '13px' }}>
        {matched}/{total} keywords matched
      </span>
      <span style={styles.dot} />
      <span style={{ color: '#166534', fontSize: '13px' }}>
        Format: {result.format_recommendation.recommended_format}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderBottom: '1px solid',
    flexShrink: 0,
    minHeight: '32px',
  },
  spinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid #93c5fd',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  dot: {
    display: 'inline-block',
    width: '3px',
    height: '3px',
    background: '#86efac',
    borderRadius: '50%',
  },
};
