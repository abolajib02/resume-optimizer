"""
Claude API prompt templates and tool schemas for resume analysis.
"""

SYSTEM_PROMPT = """You are a professional resume consultant and ATS optimization expert.

You will receive:
1. A structured resume as JSON, with stable UUIDs for each section, job, and bullet
2. A job description

Your task:
- Analyze the fit between the resume and the job description
- Score each section, job, and bullet for relevance (0.0 = irrelevant, 1.0 = perfect match)
- Recommend what to keep, remove, reorder, or collapse
- Recommend the best resume format for this role
- Provide a brief reason for each recommendation (shown to the user as a tooltip)

Critical rules:
- You MUST NOT suggest rewriting any content — only keep/remove/reorder decisions
- IDs in your response must exactly match the IDs in the input JSON
- Be selective: on a one-page resume, only the most relevant content should stay
- For bullets: if a bullet directly demonstrates a required skill, score ≥ 0.7
- For sections: move education to the top only if the role explicitly requires a specific degree

Use the submit_analysis tool to return your structured response."""

# ---------------------------------------------------------------------------
# Tool schema — defines the structured output Claude must return
# ---------------------------------------------------------------------------

ANALYSIS_TOOL: dict = {
    "name": "submit_analysis",
    "description": (
        "Submit the complete relevance analysis for a resume against a job description. "
        "All IDs must match those in the input JSON exactly."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "format_recommendation": {
                "type": "object",
                "description": "Which resume format best fits this job description.",
                "properties": {
                    "recommended_format": {
                        "type": "string",
                        "enum": ["chronological", "combination"],
                        "description": (
                            "chronological: career progression directly matches the role. "
                            "combination: skills/competencies are more relevant than any single employer."
                        ),
                    },
                    "rationale": {
                        "type": "string",
                        "description": "1-2 sentence explanation for the format recommendation.",
                    },
                    "confidence": {
                        "type": "number",
                        "description": "Confidence in the recommendation, 0.0–1.0.",
                    },
                },
                "required": ["recommended_format", "rationale", "confidence"],
            },
            "section_scores": {
                "type": "array",
                "description": "One entry per section in the resume.",
                "items": {
                    "type": "object",
                    "properties": {
                        "section_id": {"type": "string"},
                        "relevance_score": {
                            "type": "number",
                            "description": "0.0–1.0. How relevant is this section to the JD?",
                        },
                        "recommendation": {
                            "type": "string",
                            "enum": ["keep", "move_up", "move_down", "remove"],
                        },
                        "job_scores": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "job_id": {"type": "string"},
                                    "relevance_score": {"type": "number"},
                                    "recommendation": {
                                        "type": "string",
                                        "enum": ["keep", "collapse", "remove"],
                                    },
                                    "bullet_scores": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "bullet_id": {"type": "string"},
                                                "relevance_score": {"type": "number"},
                                                "ats_keywords_matched": {
                                                    "type": "array",
                                                    "items": {"type": "string"},
                                                    "description": "Keywords from the JD matched by this bullet.",
                                                },
                                                "recommendation": {
                                                    "type": "string",
                                                    "enum": ["keep", "remove", "deprioritize"],
                                                },
                                                "reason": {
                                                    "type": "string",
                                                    "description": "One sentence shown to the user explaining this recommendation.",
                                                },
                                            },
                                            "required": [
                                                "bullet_id",
                                                "relevance_score",
                                                "ats_keywords_matched",
                                                "recommendation",
                                                "reason",
                                            ],
                                        },
                                    },
                                },
                                "required": [
                                    "job_id",
                                    "relevance_score",
                                    "recommendation",
                                    "bullet_scores",
                                ],
                            },
                        },
                    },
                    "required": [
                        "section_id",
                        "relevance_score",
                        "recommendation",
                        "job_scores",
                    ],
                },
            },
            "overall_match_score": {
                "type": "number",
                "description": "Overall resume-to-JD match, 0.0–1.0.",
            },
        },
        "required": ["format_recommendation", "section_scores", "overall_match_score"],
    },
}

SKILL_SYNTHESIS_TOOL: dict = {
    "name": "submit_skill_groups",
    "description": (
        "Group resume bullets under skill category headings for a combination-format resume. "
        "Bullet IDs must exactly match the input. Each bullet appears in exactly one group."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "skill_groups": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "heading": {
                            "type": "string",
                            "description": "Category heading (2–4 words, title case).",
                        },
                        "bullet_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "IDs of bullets belonging to this category.",
                        },
                    },
                    "required": ["heading", "bullet_ids"],
                },
                "description": "3–6 skill categories, each with a heading and bullet IDs.",
            }
        },
        "required": ["skill_groups"],
    },
}

SKILL_SYNTHESIS_SYSTEM = """You are organizing resume content for a combination-format resume.
Group the provided bullets under 3–6 skill category headings meaningful to a hiring manager.

Rules:
- Category headings are NEW labels you create (this is permitted — they are structural, not content)
- Bullet text must NEVER be modified — IDs are returned verbatim
- Each bullet appears in exactly one category
- Category headings should reflect the job description's language where natural
- Use title case for headings (e.g., "Technical Leadership", "Data Analysis")

Use the submit_skill_groups tool to return your response."""
