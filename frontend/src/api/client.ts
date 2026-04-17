import type { ParsedResume, AnalysisResult, DownloadRequest } from '../types/resume';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export interface ParseResponse {
  resume: ParsedResume;
}

export async function parseResume(file: File): Promise<ParseResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/parse`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? 'Parse failed');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Analyze (async: start task → poll status)
// ---------------------------------------------------------------------------

export interface AnalyzeRequest {
  resume: ParsedResume;
  job_description: string;
}

export interface AnalyzeTaskResponse {
  task_id: string;
}

export interface AnalyzeStatusResponse {
  status: 'pending' | 'complete' | 'error';
  result?: AnalysisResult;
  error?: string;
}

export async function startAnalysis(
  payload: AnalyzeRequest
): Promise<AnalyzeTaskResponse> {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? 'Analysis failed to start');
  }

  return res.json();
}

export async function pollAnalysis(
  taskId: string
): Promise<AnalyzeStatusResponse> {
  const res = await fetch(`${BASE}/api/analyze/${taskId}/status`);

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? 'Failed to poll analysis status');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export async function downloadResume(payload: DownloadRequest): Promise<Blob> {
  const res = await fetch(`${BASE}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? 'Download failed');
  }

  return res.blob();
}

// ---------------------------------------------------------------------------
// Utility: trigger a browser file download from a Blob
// ---------------------------------------------------------------------------

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
