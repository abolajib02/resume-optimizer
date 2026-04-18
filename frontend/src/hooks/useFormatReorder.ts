/**
 * useFormatReorder
 * ================
 * Reorders sections in the Redux store whenever `selectedFormat` changes.
 *
 * Combination  → contact → summary → skills/certs/projects → experience → education → other
 * Chronological → restore to original_order from the parsed document
 *
 * sectionOrder is read through a ref so we never add it to the dependency
 * array (which would cause an infinite loop when we dispatch reorderSections).
 */
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { reorderSections } from '../store/resumeSlice';
import type { SectionType } from '../types/resume';

const COMBINATION_PRIORITY: Record<SectionType, number> = {
  contact:        0,
  summary:        1,
  skills:         2,
  certifications: 3,
  projects:       4,
  experience:     5,
  education:      6,
  military:       7,
  other:          8,
};

export function useFormatReorder(): void {
  const dispatch = useDispatch<AppDispatch>();
  const selectedFormat = useSelector((s: RootState) => s.ui.selectedFormat);
  const resume        = useSelector((s: RootState) => s.resume.resume);
  const sectionOrder  = useSelector((s: RootState) => s.resume.sectionOrder);

  // Keep a live ref to sectionOrder so the effect closure is never stale
  // without including sectionOrder in the dep array.
  const sectionOrderRef = useRef(sectionOrder);
  sectionOrderRef.current = sectionOrder;

  // Initialise to the current format so we only react to *changes*, not mount.
  const prevFormatRef = useRef(selectedFormat);

  useEffect(() => {
    if (!resume) return;
    if (prevFormatRef.current === selectedFormat) return;
    prevFormatRef.current = selectedFormat;

    const order = sectionOrderRef.current;
    const sectionMap = Object.fromEntries(resume.sections.map(s => [s.id, s]));

    let reordered: string[];

    if (selectedFormat === 'combination') {
      reordered = [...order].sort((a, b) => {
        const pa = COMBINATION_PRIORITY[sectionMap[a]?.section_type ?? 'other'] ?? 8;
        const pb = COMBINATION_PRIORITY[sectionMap[b]?.section_type ?? 'other'] ?? 8;
        return pa - pb;
      });
    } else {
      // Chronological: restore original document order
      reordered = [...order].sort((a, b) => {
        return (sectionMap[a]?.original_order ?? 0) - (sectionMap[b]?.original_order ?? 0);
      });
    }

    dispatch(reorderSections(reordered));
  }, [selectedFormat, resume, dispatch]);
}
