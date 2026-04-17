import { configureStore } from '@reduxjs/toolkit';
import resumeReducer from './resumeSlice';
import analysisReducer from './analysisSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    resume: resumeReducer,
    analysis: analysisReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
