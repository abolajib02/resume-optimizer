"""
ATS Keyword Matcher
===================
Extracts keywords from a job description and checks which ones appear in
resume text. Uses two-pass matching:
  Pass 1: Exact, case-insensitive substring match
  Pass 2: Porter stemmer match (handles "managing" vs "management")

Also maintains a small expansion table for common tech abbreviations.

Returns deterministic, explainable results — no LLM involved here.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

# ---------------------------------------------------------------------------
# NLTK bootstrapping — download once, cache
# ---------------------------------------------------------------------------


def _ensure_nltk() -> None:
    import nltk

    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)
    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords", quiet=True)


# ---------------------------------------------------------------------------
# Abbreviation expansion table
# ---------------------------------------------------------------------------

_EXPANSIONS: dict[str, list[str]] = {
    "ml": ["machine learning"],
    "ai": ["artificial intelligence"],
    "nlp": ["natural language processing"],
    "cv": ["computer vision"],
    "sql": ["structured query language"],
    "api": ["application programming interface"],
    "ci/cd": ["continuous integration", "continuous deployment"],
    "oop": ["object oriented", "object-oriented"],
    "aws": ["amazon web services"],
    "gcp": ["google cloud"],
    "k8s": ["kubernetes"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "qa": ["quality assurance"],
    "pm": ["project management", "product management"],
    "roi": ["return on investment"],
    "kpi": ["key performance indicator"],
}

# Reverse map: long form → abbreviation
_ABBREVIATIONS: dict[str, str] = {}
for abbr, expansions in _EXPANSIONS.items():
    for exp in expansions:
        _ABBREVIATIONS[exp] = abbr


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def extract_jd_keywords(job_description: str, max_keywords: int = 40) -> list[str]:
    """
    Extract up to `max_keywords` meaningful keywords from a job description.

    Strategy:
      1. Remove boilerplate punctuation
      2. Tokenize into words and short phrases (bigrams/trigrams)
      3. Remove stopwords
      4. Score by frequency × position weight (earlier = more important)
      5. Return top N, deduplicated by stem
    """
    _ensure_nltk()
    from nltk.corpus import stopwords

    stop = set(stopwords.words("english")) | {
        "experience",
        "ability",
        "skill",
        "skills",
        "work",
        "working",
        "will",
        "must",
        "required",
        "preferred",
        "include",
        "including",
        "years",
        "year",
        "strong",
        "excellent",
        "good",
        "great",
        "plus",
        "bonus",
        "nice",
        "responsibilities",
        "requirements",
        "qualifications",
    }

    text = job_description.lower()
    # Remove URLs and emails
    text = re.sub(r"https?://\S+|www\.\S+|\S+@\S+", " ", text)
    # Normalise punctuation
    text = re.sub(r"[^\w\s\-+#./]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Extract single words
    words = [w for w in text.split() if len(w) >= 2 and w not in stop]

    # Extract bigrams and trigrams that contain no stopwords
    tokens = text.split()
    bigrams = [
        f"{tokens[i]} {tokens[i+1]}"
        for i in range(len(tokens) - 1)
        if tokens[i] not in stop and tokens[i + 1] not in stop
    ]
    trigrams = [
        f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}"
        for i in range(len(tokens) - 2)
        if tokens[i] not in stop and tokens[i + 1] not in stop and tokens[i + 2] not in stop
    ]

    # Score: count occurrences (position-weighted)
    candidates: dict[str, float] = {}
    all_phrases = words + bigrams + trigrams
    for phrase in all_phrases:
        candidates[phrase] = candidates.get(phrase, 0) + 1

    # Prefer longer phrases (more specific)
    scored = sorted(
        candidates.items(),
        key=lambda x: (x[1] * len(x[0].split()), len(x[0])),
        reverse=True,
    )

    # Deduplicate: skip if a longer phrase already covers this word
    seen_stems: set[str] = set()
    result: list[str] = []
    stemmer = _get_stemmer()

    for phrase, _ in scored:
        phrase_stems = frozenset(stemmer.stem(w) for w in phrase.split())
        if phrase_stems & seen_stems:
            continue
        seen_stems |= phrase_stems
        result.append(phrase)
        if len(result) >= max_keywords:
            break

    return result


def match_keywords(
    keywords: list[str],
    resume_text: str,
) -> dict[str, bool]:
    """
    Check which keywords from `keywords` appear in `resume_text`.
    Returns {keyword: matched}.
    """
    stemmer = _get_stemmer()
    resume_lower = resume_text.lower()
    resume_stems = {stemmer.stem(w) for w in resume_lower.split()}

    result: dict[str, bool] = {}
    for kw in keywords:
        # Pass 1: exact substring match
        if kw.lower() in resume_lower:
            result[kw] = True
            continue

        # Check abbreviation expansions
        expanded = _EXPANSIONS.get(kw.lower(), [])
        if any(exp in resume_lower for exp in expanded):
            result[kw] = True
            continue

        # Pass 2: stem-based match
        kw_stems = {stemmer.stem(w) for w in kw.lower().split()}
        if kw_stems.issubset(resume_stems):
            result[kw] = True
            continue

        result[kw] = False

    return result


def resume_full_text(resume_dict: dict) -> str:
    """Extract all text from a ParsedResume dict for keyword matching."""
    parts: list[str] = [resume_dict.get("candidate_name", "")]
    for section in resume_dict.get("sections", []):
        parts.append(section.get("heading", ""))
        for job in section.get("jobs", []):
            parts.append(job.get("title", ""))
            parts.append(job.get("company", ""))
            parts.append(job.get("date_range", ""))
            for bullet in job.get("bullets", []):
                parts.append(bullet.get("text", ""))
        for fp in section.get("free_paragraphs", []):
            parts.append(fp.get("text", ""))
    return " ".join(p for p in parts if p)


@lru_cache(maxsize=1)
def _get_stemmer() -> Any:  # PorterStemmer — no stubs available
    _ensure_nltk()
    from nltk.stem import PorterStemmer

    return PorterStemmer()
