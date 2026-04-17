import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setSelectedFormat,
  setPageLimit,
  setFontSizePt,
  setMarginsInches,
  setDownloadLoading,
  setStep,
} from '../../store/uiSlice';
import { downloadResume, triggerBlobDownload } from '../../api/client';
import type { DownloadRequest } from '../../types/resume';

export default function FormattingToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedFormat, pageLimit, fontSizePt, marginsInches, downloadLoading } =
    useSelector((s: RootState) => s.ui);
  const resumeState = useSelector((s: RootState) => s.resume);
  const analysisResult = useSelector((s: RootState) => s.analysis.result);

  async function handleDownload() {
    if (!resumeState.resume) return;
    dispatch(setDownloadLoading(true));
    try {
      const payload: DownloadRequest = {
        resume: resumeState.resume,
        selection: resumeState.selection,
        section_order: resumeState.sectionOrder,
        job_order: resumeState.jobOrder,
        bullet_order: resumeState.bulletOrder,
        inline_edits: resumeState.inlineEdits,
        settings: {
          format: selectedFormat,
          page_limit: pageLimit,
          font_size_pt: fontSizePt,
          margins_inches: marginsInches,
        },
        skill_groups: analysisResult?.skill_groups ?? null,
      };
      const blob = await downloadResume(payload);
      triggerBlobDownload(blob, 'optimized_resume.docx');
    } catch (err: unknown) {
      alert('Download failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      dispatch(setDownloadLoading(false));
    }
  }

  return (
    <div style={styles.bar}>
      {/* Back button */}
      <button
        style={{ ...styles.btn, ...styles.backBtn }}
        onClick={() => dispatch(setStep('upload'))}
        title="Start over with a different resume"
      >
        ← Back
      </button>

      <div style={styles.divider} />

      {/* Format selector */}
      <label style={styles.label}>Format</label>
      <select
        style={styles.select}
        value={selectedFormat}
        onChange={e =>
          dispatch(setSelectedFormat(e.target.value as 'chronological' | 'combination'))
        }
      >
        <option value="chronological">Chronological</option>
        <option value="combination">Combination</option>
      </select>

      <div style={styles.divider} />

      {/* Page limit */}
      <label style={styles.label}>Pages</label>
      <select
        style={{ ...styles.select, width: '60px' }}
        value={pageLimit}
        onChange={e => dispatch(setPageLimit(Number(e.target.value) as 1 | 2))}
      >
        <option value={1}>1</option>
        <option value={2}>2</option>
      </select>

      <div style={styles.divider} />

      {/* Font size */}
      <label style={styles.label}>Font</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          style={styles.nudge}
          onClick={() => dispatch(setFontSizePt(fontSizePt - 0.5))}
          disabled={fontSizePt <= 10}
        >
          −
        </button>
        <span style={styles.numDisplay}>{fontSizePt}pt</span>
        <button
          style={styles.nudge}
          onClick={() => dispatch(setFontSizePt(fontSizePt + 0.5))}
          disabled={fontSizePt >= 13}
        >
          +
        </button>
      </div>

      <div style={styles.divider} />

      {/* Margins */}
      <label style={styles.label}>Margins</label>
      {(['top', 'bottom', 'left', 'right'] as const).map(side => (
        <div key={side} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={styles.marginLabel}>{side[0].toUpperCase()}</span>
          <input
            type="number"
            min={0.3}
            max={1.5}
            step={0.05}
            style={styles.marginInput}
            value={marginsInches[side]}
            onChange={e =>
              dispatch(setMarginsInches({ [side]: parseFloat(e.target.value) }))
            }
          />
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Download */}
      <button
        style={{
          ...styles.btn,
          ...styles.downloadBtn,
          ...(downloadLoading ? styles.btnDisabled : {}),
        }}
        onClick={handleDownload}
        disabled={downloadLoading}
      >
        {downloadLoading ? 'Building…' : '⬇ Download .docx'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  select: {
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #475569',
    background: '#334155',
    color: '#f1f5f9',
    fontSize: '13px',
    cursor: 'pointer',
  },
  divider: {
    width: '1px',
    height: '20px',
    background: '#334155',
    flexShrink: 0,
  },
  nudge: {
    width: '22px',
    height: '22px',
    border: '1px solid #475569',
    background: '#334155',
    color: '#f1f5f9',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  numDisplay: {
    fontSize: '13px',
    color: '#f1f5f9',
    minWidth: '36px',
    textAlign: 'center',
  },
  marginLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    width: '12px',
    flexShrink: 0,
  },
  marginInput: {
    width: '44px',
    padding: '3px 4px',
    border: '1px solid #475569',
    background: '#334155',
    color: '#f1f5f9',
    borderRadius: '4px',
    fontSize: '12px',
  },
  btn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  backBtn: {
    background: '#334155',
    color: '#94a3b8',
  },
  downloadBtn: {
    background: '#2563eb',
    color: '#fff',
  },
  btnDisabled: {
    background: '#475569',
    cursor: 'not-allowed',
  },
};
