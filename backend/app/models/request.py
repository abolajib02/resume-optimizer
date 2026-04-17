from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .analysis import SkillGroup
from .resume import ParsedResume


class AnalyzeRequest(BaseModel):
    resume: ParsedResume
    job_description: str


class FormattingSettings(BaseModel):
    format: Literal["chronological", "combination"] = "chronological"
    page_limit: Literal[1, 2] = 1
    font_size_pt: float = Field(default=11.0, ge=10.0, le=13.0)
    margins_inches: dict[str, float] = Field(
        default_factory=lambda: {
            "top": 1.0,
            "bottom": 1.0,
            "left": 1.0,
            "right": 1.0,
        }
    )


class DownloadRequest(BaseModel):
    resume: ParsedResume
    # Flat map of node id → visible. Missing ids are treated as visible.
    selection: dict[str, bool] = Field(default_factory=dict)
    # Ordered list of section ids (defines section order in output)
    section_order: list[str] = Field(default_factory=list)
    # Per-section ordered list of job ids
    job_order: dict[str, list[str]] = Field(default_factory=dict)
    # Per-job ordered list of bullet ids
    bullet_order: dict[str, list[str]] = Field(default_factory=dict)
    settings: FormattingSettings = Field(default_factory=FormattingSettings)
    # Inline edits: bullet/paragraph id → new text (user-made small edits)
    inline_edits: dict[str, str] = Field(default_factory=dict)
    # Skill groups for combination format (LLM-generated, user-approved)
    skill_groups: list[SkillGroup] | None = None


class ParseResponse(BaseModel):
    resume: ParsedResume


class AnalyzeTaskResponse(BaseModel):
    task_id: str


class AnalyzeStatusResponse(BaseModel):
    status: Literal["pending", "complete", "error"]
    result: object | None = None
    error: str | None = None
