/**
 * PageCanvas
 * ==========
 * Renders the white paper rectangle that contains the resume content.
 *
 * Dimensions at 96 DPI:
 *   US Letter: 816 × 1056 px
 *   Margins applied as CSS padding
 *
 * Overflow line:
 *   A red dashed pseudo-element drawn at the exact pixel height
 *   corresponding to the page limit boundary.
 */
import { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { usePageOverflow, inToPx, PAGE_HEIGHT_PX } from '../../hooks/usePageOverflow';
import RenderedResume from './RenderedResume';

const PAGE_WIDTH_PX = 8.5 * 96; // 816px

interface PageCanvasProps {
  onOverflowChange?: (isOverflow: boolean) => void;
}

export default function PageCanvas({ onOverflowChange }: PageCanvasProps) {
  const { pageLimit, marginsInches, fontSizePt } = useSelector(
    (s: RootState) => s.ui
  );

  const contentRef = useRef<HTMLDivElement>(null!); // non-null: attached before any effect runs
  const overflowState = usePageOverflow(
    contentRef,
    pageLimit,
    marginsInches.top,
    marginsInches.bottom
  );
  const { isOverflow, safeLimitPx, contentHeightPx } = overflowState;

  // Notify parent whenever overflow state changes
  useEffect(() => {
    onOverflowChange?.(isOverflow);
  }, [isOverflow, onOverflowChange]);

  const marginPx = {
    top: inToPx(marginsInches.top),
    bottom: inToPx(marginsInches.bottom),
    left: inToPx(marginsInches.left),
    right: inToPx(marginsInches.right),
  };

  // The overflow line sits at safeLimitPx from the top of the content div.
  // We convert that to a position inside the page (accounting for top padding).
  const overflowLineTop = marginPx.top + safeLimitPx;

  return (
    <div
      style={{
        position: 'relative',
        width: `${PAGE_WIDTH_PX}px`,
        minHeight: `${PAGE_HEIGHT_PX}px`,
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        paddingTop: `${marginPx.top}px`,
        paddingBottom: `${marginPx.bottom}px`,
        paddingLeft: `${marginPx.left}px`,
        paddingRight: `${marginPx.right}px`,
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSizePt}pt`,
        lineHeight: 1.3,
        color: '#000',
        flexShrink: 0,
      }}
    >
      {/* The resume content */}
      <RenderedResume contentRef={contentRef} />

      {/* Page-break lines for visual reference (multi-page) */}
      {pageLimit === 2 && (
        <div
          style={{
            position: 'absolute',
            top: `${marginPx.top + (PAGE_HEIGHT_PX - marginPx.top - marginPx.bottom)}px`,
            left: 0,
            right: 0,
            height: '1px',
            background: '#d1d5db',
            borderTop: '1px dashed #d1d5db',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Overflow indicator line */}
      {isOverflow && (
        <div
          style={{
            position: 'absolute',
            top: `${overflowLineTop}px`,
            left: 0,
            right: 0,
            height: '2px',
            background: 'transparent',
            borderTop: '2px dashed #ef4444',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Overflow label */}
          <span
            style={{
              position: 'absolute',
              right: '8px',
              top: '-18px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            ▼ page limit
          </span>
        </div>
      )}

      {/* Debug info (remove in production) */}
      {isOverflow && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            fontSize: '9px',
            color: '#ef4444',
            userSelect: 'none',
          }}
        >
          {Math.round(contentHeightPx)}px / {Math.round(safeLimitPx)}px limit
        </div>
      )}
    </div>
  );
}
