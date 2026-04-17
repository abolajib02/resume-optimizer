from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


def _new_id() -> str:
    return str(uuid.uuid4())


class RunStyle(BaseModel):
    """Serialized style data for a single text run within a paragraph."""
    text: str
    bold: Optional[bool] = None
    italic: Optional[bool] = None
    underline: Optional[bool] = None
    font_name: Optional[str] = None
    font_size_pt: Optional[float] = None
    color_hex: Optional[str] = None


class Bullet(BaseModel):
    id: str = Field(default_factory=_new_id)
    text: str                          # clean text, bullet char stripped
    run_styles: list[RunStyle]         # per-run formatting for reconstruction
    paragraph_style: str               # original Word paragraph style name
    original_index: int                # position within parent job/section


class FreeParagraph(BaseModel):
    """Non-bullet paragraph within a section (e.g. skill lines, degree lines)."""
    id: str = Field(default_factory=_new_id)
    text: str
    run_styles: list[RunStyle]
    paragraph_style: str
    original_index: int


class Job(BaseModel):
    id: str = Field(default_factory=_new_id)
    title: str
    company: str
    date_range: str
    location: Optional[str] = None
    bullets: list[Bullet] = Field(default_factory=list)
    # Styling for the job header lines (title, company/date)
    title_run_styles: list[RunStyle] = Field(default_factory=list)
    title_paragraph_style: str = "Normal"
    company_run_styles: list[RunStyle] = Field(default_factory=list)
    company_paragraph_style: str = "Normal"
    date_run_styles: list[RunStyle] = Field(default_factory=list)
    date_paragraph_style: str = "Normal"
    # Paragraphs in the job header that didn't resolve into title/company cleanly
    raw_header_paragraphs: list[FreeParagraph] = Field(default_factory=list)
    original_order: int = 0            # position within parent section


SectionType = Literal[
    "contact",
    "summary",
    "experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "military",
    "other",
]


class Section(BaseModel):
    id: str = Field(default_factory=_new_id)
    heading: str
    heading_run_styles: list[RunStyle] = Field(default_factory=list)
    heading_paragraph_style: str = "Normal"
    section_type: SectionType
    jobs: list[Job] = Field(default_factory=list)
    free_paragraphs: list[FreeParagraph] = Field(default_factory=list)
    original_order: int = 0


class DocumentStyles(BaseModel):
    """Document-level style defaults captured from the source DOCX."""
    default_font_name: Optional[str] = None
    default_font_size_pt: Optional[float] = None
    page_width_inches: Optional[float] = None
    page_height_inches: Optional[float] = None
    margin_top_inches: Optional[float] = None
    margin_bottom_inches: Optional[float] = None
    margin_left_inches: Optional[float] = None
    margin_right_inches: Optional[float] = None


ResumeFormat = Literal["chronological", "combination", "unknown"]


class ParsedResume(BaseModel):
    id: str = Field(default_factory=_new_id)
    candidate_name: str = ""
    sections: list[Section]
    detected_format: ResumeFormat = "unknown"
    source_styles: DocumentStyles = Field(default_factory=DocumentStyles)
    parse_warnings: list[str] = Field(default_factory=list)
