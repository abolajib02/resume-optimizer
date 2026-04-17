/**
 * useAnalysisPoller
 * =================
 * Polls /api/analyze/{taskId}/status every 2 seconds while status is "pending".
 * On completion:
 *   1. Dispatches setAnalysisResult to the analysis slice.
 *   2. Auto-applies "remove" recommendations to the resume selection map.
 *   3. Triggers the format recommendation modal if the LLM recommends a
 *      different format than what is currently selected.
 */
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { setAnalysisResult, setAnalysisError } from '../store/analysisSlice';
import { applySelection } from '../store/resumeSlice';
import { applyFormatRecommendation } from '../store/uiSlice';
import { pollAnalysis } from '../api/client';
import type { AnalysisResult } from '../types/resume';

const POLL_INTERVAL_MS = 2000;

export function useAnalysisPoller(): void {
  const dispatch = useDispatch<AppDispatch>();
  const taskId = useSelector((s: RootState) => s.analysis.taskId);
  const status = useSelector((s: RootState) => s.analysis.status);
  const currentFormat = useSelector((s: RootState) => s.ui.selectedFormat);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Capture currentFormat in a ref so the interval closure stays fresh
  const formatRef = useRef(currentFormat);
  formatRef.current = currentFormat;

  useEffect(() => {
    if (!taskId || status !== 'pending') return;

    intervalRef.current = setInterval(async () => {
      try {
        const data = await pollAnalysis(taskId);

        if (data.status === 'complete' && data.result) {
          clearInterval(intervalRef.current!);
          _onComplete(data.result);
        } else if (data.status === 'error') {
          clearInterval(intervalRef.current!);
          dispatch(setAnalysisError(data.error ?? 'Analysis failed.'));
        }
        // 'pending' → keep polling
      } catch (err: any) {
        clearInterval(intervalRef.current!);
        dispatch(setAnalysisError(err.message ?? 'Polling failed.'));
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [taskId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  function _onComplete(result: AnalysisResult) {
    // 1. Store result
    dispatch(setAnalysisResult(result));

    // 2. Auto-apply "remove" / "collapse" recommendations to visibility map
    const selectionPatch: Record<string, boolean> = {};
    for (const ss of result.section_scores) {
      if (ss.recommendation === 'remove') {
        selectionPatch[ss.section_id] = false;
      }
      for (const js of ss.job_scores) {
        if (js.recommendation === 'remove') {
          selectionPatch[js.job_id] = false;
        }
        for (const bs of js.bullet_scores) {
          if (bs.recommendation === 'remove') {
            selectionPatch[bs.bullet_id] = false;
          }
        }
      }
    }
    if (Object.keys(selectionPatch).length > 0) {
      dispatch(applySelection(selectionPatch));
    }

    // 3. Show format modal if recommended format differs from current
    const recommended = result.format_recommendation.recommended_format;
    if (recommended !== formatRef.current) {
      dispatch(applyFormatRecommendation(recommended));
    }
  }
}
