import { useEffect, useState } from 'react';

const DPI = 96;
const PAGE_HEIGHT_IN = 11;
const PAGE_HEIGHT_PX = PAGE_HEIGHT_IN * DPI; // 1056px

interface OverflowState {
  isOverflow: boolean;
  // Pixel height of the safe zone (page limit × content height in px)
  safeLimitPx: number;
  // Actual rendered content height
  contentHeightPx: number;
}

/**
 * Watches `contentRef` with a ResizeObserver and reports whether the content
 * overflows the allowed page count.
 *
 * @param contentRef  ref attached to the scrollable content div
 * @param pageLimit   1 or 2
 * @param marginTopIn top margin in inches
 * @param marginBotIn bottom margin in inches
 */
export function usePageOverflow(
  contentRef: React.RefObject<HTMLElement>,
  pageLimit: 1 | 2,
  marginTopIn: number,
  marginBotIn: number
): OverflowState {
  const [state, setState] = useState<OverflowState>({
    isOverflow: false,
    safeLimitPx: PAGE_HEIGHT_PX * pageLimit,
    contentHeightPx: 0,
  });

  // Recompute the safe limit whenever pageLimit or margins change
  const safeLimitPx =
    (PAGE_HEIGHT_PX - (marginTopIn + marginBotIn) * DPI) * pageLimit * 0.95;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setState({
        isOverflow: h > safeLimitPx,
        safeLimitPx,
        contentHeightPx: h,
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [contentRef, safeLimitPx]);

  return state;
}

/** Convert inches to pixels at 96 DPI */
export function inToPx(inches: number): number {
  return inches * DPI;
}

export { PAGE_HEIGHT_PX, DPI };
