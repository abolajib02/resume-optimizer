import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Step = 'upload' | 'workspace';

interface UiState {
  step: Step;
  selectedFormat: 'chronological' | 'combination';
  pageLimit: 1 | 2;
  fontSizePt: number;
  marginsInches: { top: number; bottom: number; left: number; right: number };
  parseLoading: boolean;
  downloadLoading: boolean;
  // Format confirm modal: shown once after analysis returns a recommendation
  showFormatModal: boolean;
  jobDescription: string;
}

const initialState: UiState = {
  step: 'upload',
  selectedFormat: 'chronological',
  pageLimit: 1,
  fontSizePt: 11,
  marginsInches: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
  parseLoading: false,
  downloadLoading: false,
  showFormatModal: false,
  jobDescription: '',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<Step>) {
      state.step = action.payload;
    },

    setSelectedFormat(
      state,
      action: PayloadAction<'chronological' | 'combination'>
    ) {
      state.selectedFormat = action.payload;
    },

    setPageLimit(state, action: PayloadAction<1 | 2>) {
      state.pageLimit = action.payload;
    },

    setFontSizePt(state, action: PayloadAction<number>) {
      state.fontSizePt = Math.min(13, Math.max(10, action.payload));
    },

    setMarginsInches(
      state,
      action: PayloadAction<Partial<UiState['marginsInches']>>
    ) {
      state.marginsInches = { ...state.marginsInches, ...action.payload };
    },

    setParseLoading(state, action: PayloadAction<boolean>) {
      state.parseLoading = action.payload;
    },

    setDownloadLoading(state, action: PayloadAction<boolean>) {
      state.downloadLoading = action.payload;
    },

    showFormatModal(state) {
      state.showFormatModal = true;
    },

    dismissFormatModal(state) {
      state.showFormatModal = false;
    },

    setJobDescription(state, action: PayloadAction<string>) {
      state.jobDescription = action.payload;
    },

    // Show the format confirmation modal — selectedFormat is NOT changed here.
    // The user's click inside FormatModal applies the actual change.
    applyFormatRecommendation(state) {
      state.showFormatModal = true;
    },
  },
});

export const {
  setStep,
  setSelectedFormat,
  setPageLimit,
  setFontSizePt,
  setMarginsInches,
  setParseLoading,
  setDownloadLoading,
  showFormatModal,
  dismissFormatModal,
  setJobDescription,
  applyFormatRecommendation,
} = uiSlice.actions;

export default uiSlice.reducer;
