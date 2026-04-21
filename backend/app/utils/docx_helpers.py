"""Low-level helpers for inspecting python-docx objects."""

from __future__ import annotations

import re

from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

# Bullet characters commonly found in resumes
BULLET_CHARS = {"•", "·", "◦", "▪", "▸", "►", "–", "—", "-", "*", "○", "●", "■", "□"}

# Regex for date ranges:
#   "Jan 2020 – Present", "2018 - 2023", "03/2015 – 06/2019", "01/2019 – 10/2023"
_MONTH_NAME = r"""(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|
           Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|
           Dec(?:ember)?)"""
_DATE_UNIT = rf"""(?:(?:{_MONTH_NAME}[\s,]+)|\d{{1,2}}/)?  # optional month name or MM/
              \d{{4}}"""  # 4-digit year
_END_UNIT = rf"""(?:(?:{_MONTH_NAME}[\s,]+)|\d{{1,2}}/)?
             (?:\d{{4}}|[Pp]resent|[Cc]urrent|[Tt]oday)"""
DATE_RANGE_RE = re.compile(
    rf"""
    {_DATE_UNIT}
    \s*[\–\-–—]\s*
    {_END_UNIT}
    """,
    re.VERBOSE,
)

# Section heading keyword map — order matters: more specific types are checked first.
# A heading that matches multiple types (e.g. "SELECTED SKILLS/EXPERIENCE") will
# resolve to whichever type appears first in this dict.
SECTION_KEYWORDS: dict[str, list[str]] = {
    "skills": [
        "skills",
        "competencies",
        "technical skills",
        "expertise",
        "core competencies",
        "selected skills",
        "key skills",
    ],
    "experience": [
        "experience",
        "employment",
        "work history",
        "work experience",
        "career",
        "professional background",
        "professional experience",
    ],
    "education": ["education", "academic", "degree", "schooling", "university"],
    "summary": [
        "summary",
        "profile",
        "objective",
        "about",
        "professional summary",
        "career summary",
        "overview",
    ],
    "certifications": [
        "certifications",
        "licenses",
        "credentials",
        "certificate",
        "professional development",
        "training",
    ],
    "projects": ["projects", "portfolio", "notable projects"],
    "military": ["military", "armed forces", "service", "veteran"],
    "contact": ["contact"],
}


def pt_from_emu(emu: int | None) -> float | None:
    """Convert EMU (English Metric Units) to points. 1pt = 12700 EMU."""
    if emu is None:
        return None
    return round(emu / 12700, 2)


def paragraph_font_size_pt(para: Paragraph) -> float | None:
    """Return the most common font size (in pt) across runs, or None."""
    sizes = []
    for run in para.runs:
        if run.font.size:
            sizes.append(pt_from_emu(run.font.size))
    if not sizes:
        return None
    return max(set(sizes), key=sizes.count)


def paragraph_is_bold(para: Paragraph) -> bool:
    """True if any run in the paragraph is bold."""
    return any(run.bold for run in para.runs)


def paragraph_is_underlined(para: Paragraph) -> bool:
    """True if any run in the paragraph is underlined."""
    return any(run.underline for run in para.runs)


def paragraph_has_bottom_border(para: Paragraph) -> bool:
    """True if the paragraph XML contains a bottom border (common in resume headers)."""
    pPr = para._p.find(qn("w:pPr"))
    if pPr is None:
        return False
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is None:
        return False
    return pBdr.find(qn("w:bottom")) is not None


def paragraph_left_indent_emu(para: Paragraph) -> int:
    """Return paragraph left indent in EMU, or 0."""
    fmt = para.paragraph_format
    ind = fmt.left_indent
    return ind if ind else 0


def strip_bullet_char(text: str) -> str:
    """Remove a leading bullet character and whitespace from text."""
    text = text.lstrip()
    if text and text[0] in BULLET_CHARS:
        text = text[1:].lstrip()
    return text


def serialize_runs(para: Paragraph) -> list[dict]:
    """Serialize all runs in a paragraph to dicts for storage."""
    result = []
    for run in para.runs:
        color_hex = None
        try:
            if run.font.color and run.font.color.rgb:
                color_hex = str(run.font.color.rgb)
        except Exception:
            pass

        result.append(
            {
                "text": run.text,
                "bold": run.bold,
                "italic": run.italic,
                "underline": run.underline,
                "font_name": run.font.name,
                "font_size_pt": pt_from_emu(run.font.size),
                "color_hex": color_hex,
            }
        )
    return result


def classify_section(heading_text: str) -> str:
    """Map a section heading string to a SectionType."""
    normalized = heading_text.lower().strip()
    for section_type, keywords in SECTION_KEYWORDS.items():
        for kw in keywords:
            if kw in normalized:
                return section_type
    return "other"


def contains_date_range(text: str) -> bool:
    """True if the text contains a recognizable employment date range."""
    return bool(DATE_RANGE_RE.search(text))


def extract_date_range(text: str) -> str | None:
    """Extract and return the first date range found in text, or None."""
    m = DATE_RANGE_RE.search(text)
    return m.group(0).strip() if m else None
