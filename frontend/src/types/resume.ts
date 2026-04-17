// TypeScript mirrors of the backend Pydantic models.
// Keep in sync with backend/app/models/resume.py and analysis.py

export interface RunStyle {
  text: string;
  bold: boolean | null;
  italic: boolean | null;
  underline: boolean | null;
  font_name: string | null;
  font_size_pt: number | null;
  color_hex: string | null;
}

export interface Bullet {
  id: string;
  text: string;
  run_styles: RunStyle[];
  paragraph_style: string;
  original_index: number;
}

export interface FreeParagraph {
  id: string;
  text: string;
  run_styles: RunStyle[];
  paragraph_style: string;
  original_index: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  date_range: string;
  location: string | null;
  bullets: Bullet[];
  title_run_styles: RunStyle[];
  title_paragraph_style: string;
  company_run_styles: RunStyle[];
  company_paragraph_style: string;
  date_run_styles: RunStyle[];
  date_paragraph_style: string;
  raw_header_paragraphs: FreeParagraph[];
  original_order: number;
}

export type SectionType =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'projects'
  | 'military'
  | 'other';

export interface Section {
  id: string;
  heading: string;
  heading_run_styles: RunStyle[];
  heading_paragraph_style: string;
  section_type: SectionType;
  jobs: Job[];
  free_paragraphs: FreeParagraph[];
  original_order: number;
}

export interface DocumentStyles {
  default_font_name: string | null;
  default_font_size_pt: number | null;
  page_width_inches: number | null;
  page_height_inches: number | null;
  margin_top_inches: number | null;
  margin_bottom_inches: number | null;
  margin_left_inches: number | null;
  margin_right_inches: number | null;
}

export type ResumeFormat = 'chronological' | 'combination' | 'unknown';

export interface ParsedResume {
  id: string;
  candidate_name: string;
  sections: Section[];
  detected_format: ResumeFormat;
  source_styles: DocumentStyles;
  parse_warnings: string[];
}

// ---- Analysis types (mirrors of analysis.py) ----

export interface BulletScore {
  bullet_id: string;
  relevance_score: number;
  ats_keywords_matched: string[];
  recommendation: 'keep' | 'remove' | 'deprioritize';
  reason: string;
}

export interface JobScore {
  job_id: string;
  relevance_score: number;
  bullet_scores: BulletScore[];
  recommendation: 'keep' | 'collapse' | 'remove';
}

export interface SectionScore {
  section_id: string;
  relevance_score: number;
  job_scores: JobScore[];
  recommendation: 'keep' | 'move_up' | 'move_down' | 'remove';
}

export interface FormatRecommendation {
  recommended_format: 'chronological' | 'combination';
  rationale: string;
  confidence: number;
}

export interface SkillGroup {
  heading: string;
  bullet_ids: string[];
}

export interface AnalysisResult {
  resume_id: string;
  format_recommendation: FormatRecommendation;
  section_scores: SectionScore[];
  ats_keyword_coverage: Record<string, boolean>;
  overall_match_score: number;
  skill_groups: SkillGroup[] | null;
}

// ---- Request / response shapes ----

export interface FormattingSettings {
  format: 'chronological' | 'combination';
  page_limit: 1 | 2;
  font_size_pt: number;
  margins_inches: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface DownloadRequest {
  resume: ParsedResume;
  selection: Record<string, boolean>;
  section_order: string[];
  job_order: Record<string, string[]>;
  bullet_order: Record<string, string[]>;
  settings: FormattingSettings;
  inline_edits: Record<string, string>;
  skill_groups: SkillGroup[] | null;
}
