from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class BulletScore(BaseModel):
    bullet_id: str
    relevance_score: float             # 0.0 – 1.0
    ats_keywords_matched: list[str]
    recommendation: Literal["keep", "remove", "deprioritize"]
    reason: str                        # one sentence shown in UI tooltip


class JobScore(BaseModel):
    job_id: str
    relevance_score: float
    bullet_scores: list[BulletScore]
    recommendation: Literal["keep", "collapse", "remove"]


class SectionScore(BaseModel):
    section_id: str
    relevance_score: float
    job_scores: list[JobScore]
    recommendation: Literal["keep", "move_up", "move_down", "remove"]


class FormatRecommendation(BaseModel):
    recommended_format: Literal["chronological", "combination"]
    rationale: str
    confidence: float                  # 0.0 – 1.0


class SkillGroup(BaseModel):
    heading: str                       # LLM-generated category label
    bullet_ids: list[str]


class AnalysisResult(BaseModel):
    resume_id: str
    format_recommendation: FormatRecommendation
    section_scores: list[SectionScore]
    ats_keyword_coverage: dict[str, bool]  # { keyword: matched }
    overall_match_score: float
    skill_groups: list[SkillGroup] | None = None  # populated for combination format
