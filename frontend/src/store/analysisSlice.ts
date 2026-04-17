import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AnalysisResult } from '../types/resume';

interface AnalysisState {
  result: AnalysisResult | null;
  taskId: string | null;
  status: 'idle' | 'pending' | 'complete' | 'error';
  errorMessage: string | null;
}

const initialState: AnalysisState = {
  result: null,
  taskId: null,
  status: 'idle',
  errorMessage: null,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    startAnalysis(state, action: PayloadAction<string>) {
      state.taskId = action.payload;
      state.status = 'pending';
      state.result = null;
      state.errorMessage = null;
    },

    setAnalysisResult(state, action: PayloadAction<AnalysisResult>) {
      state.result = action.payload;
      state.status = 'complete';
    },

    setAnalysisError(state, action: PayloadAction<string>) {
      state.errorMessage = action.payload;
      state.status = 'error';
    },

    clearAnalysis() {
      return initialState;
    },
  },
});

export const {
  startAnalysis,
  setAnalysisResult,
  setAnalysisError,
  clearAnalysis,
} = analysisSlice.actions;

export default analysisSlice.reducer;
