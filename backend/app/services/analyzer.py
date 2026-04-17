"""
Resume Analyzer
===============
Calls the Anthropic API to score resume sections/jobs/bullets against a job
description, then optionally synthesises skill groups for combination format.

Flow
----
1. Build a stripped representation of the resume (IDs + text only — no run-
   style noise) to keep the prompt compact.
2. Run deterministic ATS keyword matching.
3. Call Claude claude-sonnet-4-6 with the ANALYSIS_TOOL schema (tool_use).
4. Parse the tool result into an AnalysisResult.
5. If the recommended format is "combination", call Claude again with the
   SKILL_SYNTHESIS_TOOL to group bullets under category headings.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import anthropic

from app.config import settings
from app.models.analysis import (
    AnalysisResult,
    BulletScore,
    FormatRecommendation,
    JobScore,
    SectionScore,
    SkillGroup,
)
from app.models.resume import ParsedResume
from app.prompts.analysis import (
    ANALYSIS_TOOL,
    SKILL_SYNTHESIS_SYSTEM,
    SKILL_SYNTHESIS_TOOL,
    SYSTEM_PROMPT,
)
from app.services.keyword_matcher import (
    extract_jd_keywords,
    match_keywords,
    resume_full_text,
)

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def analyze_resume(resume: ParsedResume, job_description: str) -> AnalysisResult:
    """
    Analyse the resume against the job description.
    Returns a fully-populated AnalysisResult.
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # 1. ATS keyword matching (deterministic)
    keywords = extract_jd_keywords(job_description, max_keywords=40)
    full_text = resume_full_text(resume.model_dump())
    ats_coverage = match_keywords(keywords, full_text)

    # 2. Build stripped resume JSON for the prompt
    stripped = _strip_resume(resume)

    user_message = (
        f"## Resume\n```json\n{json.dumps(stripped, indent=2)}\n```\n\n"
        f"## Job Description\n{job_description}"
    )

    # 3. Call Claude with the analysis tool
    raw_analysis = await _call_tool(
        client=client,
        system=SYSTEM_PROMPT,
        user=user_message,
        tool=ANALYSIS_TOOL,
    )

    # 4. Parse into AnalysisResult
    result = _parse_analysis(raw_analysis, resume, ats_coverage)

    # 5. If combination format, synthesise skill groups
    if result.format_recommendation.recommended_format == "combination":
        result.skill_groups = await _synthesise_skill_groups(
            client, resume, result, job_description
        )

    return result


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _strip_resume(resume: ParsedResume) -> dict[str, Any]:
    """
    Return only the fields Claude needs: IDs and text.
    Omits all run_styles, paragraph_style, original_order, etc.
    """
    sections = []
    for sec in resume.sections:
        jobs = []
        for job in sec.jobs:
            bullets = [{"id": b.id, "text": b.text} for b in job.bullets]
            jobs.append(
                {
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "date_range": job.date_range,
                    "bullets": bullets,
                }
            )
        free = [{"id": fp.id, "text": fp.text} for fp in sec.free_paragraphs]
        sections.append(
            {
                "id": sec.id,
                "heading": sec.heading,
                "section_type": sec.section_type,
                "jobs": jobs,
                "free_paragraphs": free,
            }
        )
    return {
        "resume_id": resume.id,
        "candidate_name": resume.candidate_name,
        "sections": sections,
    }


async def _call_tool(
    client: anthropic.AsyncAnthropic,
    system: str,
    user: str,
    tool: dict[str, Any],
) -> dict[str, Any]:
    """
    Make a single async Anthropic API call requesting tool_use.
    Returns the tool input dict from the response.
    """
    response = await client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
        tools=[tool],
        tool_choice={"type": "any"},
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == tool["name"]:
            return block.input  # type: ignore[return-value]

    raise RuntimeError(
        f"Claude did not call the expected tool '{tool['name']}'. "
        f"Response: {response.model_dump_json()}"
    )


def _parse_analysis(
    raw: dict[str, Any],
    resume: ParsedResume,
    ats_coverage: dict[str, bool],
) -> AnalysisResult:
    """
    Convert the raw tool output dict into a validated AnalysisResult.
    IDs that Claude returned but don't exist in the resume are silently dropped.
    """
    # Build ID sets for validation
    valid_section_ids = {s.id for s in resume.sections}
    valid_job_ids = {j.id for s in resume.sections for j in s.jobs}
    valid_bullet_ids = {
        b.id for s in resume.sections for j in s.jobs for b in j.bullets
    }

    section_scores: list[SectionScore] = []
    for ss in raw.get("section_scores", []):
        sid = ss.get("section_id", "")
        if sid not in valid_section_ids:
            logger.warning("Unknown section_id from Claude: %s", sid)
            continue

        job_scores: list[JobScore] = []
        for js in ss.get("job_scores", []):
            jid = js.get("job_id", "")
            if jid not in valid_job_ids:
                logger.warning("Unknown job_id from Claude: %s", jid)
                continue

            bullet_scores: list[BulletScore] = []
            for bs in js.get("bullet_scores", []):
                bid = bs.get("bullet_id", "")
                if bid not in valid_bullet_ids:
                    logger.warning("Unknown bullet_id from Claude: %s", bid)
                    continue
                bullet_scores.append(
                    BulletScore(
                        bullet_id=bid,
                        relevance_score=float(bs.get("relevance_score", 0.0)),
                        ats_keywords_matched=bs.get("ats_keywords_matched", []),
                        recommendation=bs.get("recommendation", "keep"),
                        reason=bs.get("reason", ""),
                    )
                )

            job_scores.append(
                JobScore(
                    job_id=jid,
                    relevance_score=float(js.get("relevance_score", 0.0)),
                    recommendation=js.get("recommendation", "keep"),
                    bullet_scores=bullet_scores,
                )
            )

        section_scores.append(
            SectionScore(
                section_id=sid,
                relevance_score=float(ss.get("relevance_score", 0.0)),
                recommendation=ss.get("recommendation", "keep"),
                job_scores=job_scores,
            )
        )

    fmt_raw = raw.get("format_recommendation", {})
    format_recommendation = FormatRecommendation(
        recommended_format=fmt_raw.get("recommended_format", "chronological"),
        rationale=fmt_raw.get("rationale", ""),
        confidence=float(fmt_raw.get("confidence", 0.5)),
    )

    return AnalysisResult(
        resume_id=resume.id,
        format_recommendation=format_recommendation,
        section_scores=section_scores,
        ats_keyword_coverage=ats_coverage,
        overall_match_score=float(raw.get("overall_match_score", 0.0)),
        skill_groups=None,
    )


async def _synthesise_skill_groups(
    client: anthropic.AsyncAnthropic,
    resume: ParsedResume,
    analysis: AnalysisResult,
    job_description: str,
) -> list[SkillGroup]:
    """
    Call Claude a second time to group bullets under skill category headings.
    Only bullets recommended "keep" or "deprioritize" are included.
    """
    # Collect kept bullets with their text
    kept_bullets: list[dict[str, str]] = []
    kept_ids: set[str] = set()
    for ss in analysis.section_scores:
        for js in ss.job_scores:
            for bs in js.bullet_scores:
                if bs.recommendation != "remove":
                    kept_ids.add(bs.bullet_id)

    for sec in resume.sections:
        for job in sec.jobs:
            for bullet in job.bullets:
                if bullet.id in kept_ids:
                    kept_bullets.append({"id": bullet.id, "text": bullet.text})

    if not kept_bullets:
        return []

    user_message = (
        f"## Job Description\n{job_description}\n\n"
        f"## Bullets to group\n```json\n{json.dumps(kept_bullets, indent=2)}\n```"
    )

    try:
        raw = await _call_tool(
            client=client,
            system=SKILL_SYNTHESIS_SYSTEM,
            user=user_message,
            tool=SKILL_SYNTHESIS_TOOL,
        )
    except Exception as exc:
        logger.error("Skill synthesis failed: %s", exc)
        return []

    groups: list[SkillGroup] = []
    valid_ids = {b["id"] for b in kept_bullets}
    for group in raw.get("skill_groups", []):
        bullet_ids = [bid for bid in group.get("bullet_ids", []) if bid in valid_ids]
        if bullet_ids:
            groups.append(
                SkillGroup(heading=group.get("heading", ""), bullet_ids=bullet_ids)
            )

    return groups
