import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ParsedResume, Section, Job } from '../types/resume';

interface ResumeState {
  resume: ParsedResume | null;
  // Flat map of node id → visible. Missing = visible (true).
  selection: Record<string, boolean>;
  // Ordered section ids (defines output order)
  sectionOrder: string[];
  // Per-section ordered job ids
  jobOrder: Record<string, string[]>;
  // Per-job ordered bullet ids
  bulletOrder: Record<string, string[]>;
  // Inline text edits: node id → edited text
  inlineEdits: Record<string, string>;
}

const initialState: ResumeState = {
  resume: null,
  selection: {},
  sectionOrder: [],
  jobOrder: {},
  bulletOrder: {},
  inlineEdits: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultSectionOrder(sections: Section[]): string[] {
  return [...sections].sort((a, b) => a.original_order - b.original_order).map(s => s.id);
}

function defaultJobOrder(section: Section): string[] {
  return [...section.jobs].sort((a, b) => a.original_order - b.original_order).map(j => j.id);
}

function defaultBulletOrder(job: Job): string[] {
  return [...job.bullets].sort((a, b) => a.original_index - b.original_index).map(b => b.id);
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    setResume(state, action: PayloadAction<ParsedResume>) {
      const resume = action.payload;
      state.resume = resume;
      state.selection = {};
      state.inlineEdits = {};

      // Initialise default orderings from original_order / original_index
      state.sectionOrder = defaultSectionOrder(resume.sections);

      state.jobOrder = {};
      state.bulletOrder = {};
      for (const section of resume.sections) {
        state.jobOrder[section.id] = defaultJobOrder(section);
        for (const job of section.jobs) {
          state.bulletOrder[job.id] = defaultBulletOrder(job);
        }
      }
    },

    clearResume() {
      return initialState;
    },

    // --- Visibility toggles ---

    toggleSection(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selection[id] = !(state.selection[id] ?? true);
    },

    toggleJob(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selection[id] = !(state.selection[id] ?? true);
    },

    toggleBullet(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selection[id] = !(state.selection[id] ?? true);
    },

    toggleFreeParagraph(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selection[id] = !(state.selection[id] ?? true);
    },

    // Bulk-apply LLM recommendations: set multiple ids at once
    applySelection(state, action: PayloadAction<Record<string, boolean>>) {
      state.selection = { ...state.selection, ...action.payload };
    },

    // --- Reordering ---

    reorderSections(state, action: PayloadAction<string[]>) {
      state.sectionOrder = action.payload;
    },

    reorderJobs(
      state,
      action: PayloadAction<{ sectionId: string; orderedIds: string[] }>
    ) {
      state.jobOrder[action.payload.sectionId] = action.payload.orderedIds;
    },

    reorderBullets(
      state,
      action: PayloadAction<{ jobId: string; orderedIds: string[] }>
    ) {
      state.bulletOrder[action.payload.jobId] = action.payload.orderedIds;
    },

    // --- Inline edits ---

    applyInlineEdit(
      state,
      action: PayloadAction<{ nodeId: string; text: string }>
    ) {
      state.inlineEdits[action.payload.nodeId] = action.payload.text;
    },

    clearInlineEdit(state, action: PayloadAction<string>) {
      delete state.inlineEdits[action.payload];
    },
  },
});

export const {
  setResume,
  clearResume,
  toggleSection,
  toggleJob,
  toggleBullet,
  toggleFreeParagraph,
  applySelection,
  reorderSections,
  reorderJobs,
  reorderBullets,
  applyInlineEdit,
  clearInlineEdit,
} = resumeSlice.actions;

export default resumeSlice.reducer;
