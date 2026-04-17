/**
 * ResumePreview
 * =============
 * The right panel of the workspace.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │  [overflow banner if needed] │
 *   │                              │
 *   │  ┌────── PageCanvas ──────┐  │
 *   │  │   (white paper sheet)  │  │
 *   │  │   resume content here  │  │
 *   │  └────────────────────────┘  │
 *   └──────────────────────────────┘
 *
 * The PageCanvas is centered and scaled to fit the panel width while
 * maintaining its physical proportions.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { toggleBullet, toggleFreeParagraph } from '../../store/resumeSlice';
import PageCanvas from './PageCanvas';

const PAGE_WIDTH_PX = 816;

// ---------------------------------------------------------------------------
// Overflow suggestion banner
// ---------------------------------------------------------------------------

function OverflowBanner({ onDismiss }: { onDismiss: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const resume = useSelector((s: RootState) => s.resume.resume);
  const selection = useSelector((s: RootState) => s.resume.selection);
  const analysisResult = useSelector((s: RootState) => s.analysis.result);

  if (!resume) return null;

  // Gather lowest-scored visible bullets from analysis
  interface Suggestion {
    id: string;
    type: 'bullet' | 'paragraph';
    text: string;
    score: number;
  }
  const suggestions: Suggestion[] = [];

  if (analysisResult) {
    for (const ss of analysisResult.section_scores) {
      for (const js of ss.job_scores) {
        for (const bs of js.bullet_scores) {
          if (
            bs.recommendation === 'remove' &&
            (selection[bs.bullet_id] ?? true)
          ) {
            for (const section of resume.sections) {
              for (const job of section.jobs) {
                const b = job.bullets.find(b => b.id === bs.bullet_id);
                if (b) {
                  suggestions.push({
                    id: b.id,
                    type: 'bullet',
                    text: b.text,
                    score: bs.relevance_score,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  suggestions.sort((a, b) => a.score - b.score);
  const topSuggestions = suggestions.slice(0, 4);

  return (
    <div
      style={{
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: topSuggestions.length > 0 ? '10px' : 0 }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span style={{ fontWeight: 600, color: '#991b1b', fontSize: '13px' }}>
          Content exceeds the page limit
        </span>
        <button
          onClick={onDismiss}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', padding: 0, lineHeight: 1 }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {topSuggestions.length > 0 ? (
        <>
          <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#7f1d1d' }}>
            Consider removing these low-relevance items:
          </p>
          {topSuggestions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
              <button
                onClick={() =>
                  s.type === 'bullet'
                    ? dispatch(toggleBullet(s.id))
                    : dispatch(toggleFreeParagraph(s.id))
                }
                style={{
                  flexShrink: 0,
                  padding: '2px 8px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Hide
              </button>
              <span style={{ fontSize: '11px', color: '#7f1d1d', flex: 1, lineHeight: 1.4 }}>
                {s.text.length > 90 ? s.text.slice(0, 90) + '…' : s.text}
              </span>
            </div>
          ))}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>
          Uncheck items in the tree panel to reduce content, or reduce the font
          size / margins in the toolbar.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function ResumePreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isOverflow, setIsOverflow] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const resume = useSelector((s: RootState) => s.resume.resume);

  // Re-show the banner whenever overflow state flips to true
  const handleOverflowChange = useCallback((overflow: boolean) => {
    setIsOverflow(overflow);
    if (overflow) setBannerDismissed(false);
  }, []);

  // Scale the page canvas to fit the available panel width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const availableWidth = entry.contentRect.width - 48;
      setScale(Math.min(1, availableWidth / PAGE_WIDTH_PX));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!resume) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
        Upload a resume to see the preview
      </div>
    );
  }

  const scaledPageWidth = PAGE_WIDTH_PX * scale;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      {/* Overflow banner */}
      {isOverflow && !bannerDismissed && (
        <div style={{ width: `${scaledPageWidth}px`, marginBottom: '12px' }}>
          <OverflowBanner onDismiss={() => setBannerDismissed(true)} />
        </div>
      )}

      {/* Page canvas, scaled to fit panel width */}
      <div
        style={{
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
          // Collapse the extra space created by the scale-down
          marginBottom: scale < 1 ? `${-PAGE_WIDTH_PX * (1 - scale) * 1.22}px` : 0,
        }}
      >
        <PageCanvas onOverflowChange={handleOverflowChange} />
      </div>
    </div>
  );
}
