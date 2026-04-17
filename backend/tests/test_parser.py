"""
Tests for the DOCX parser.
Run: cd backend && pytest tests/test_parser.py -v
"""
import os
import pytest
from app.services.parser import parse_resume
from app.models.resume import ParsedResume

# Paths to the provided resume templates (adjust if needed)
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
CHRONOLOGICAL = os.path.join(
    os.path.expanduser("~"), "Downloads", "Chronological Resume Template.docx"
)
COMBINATION = os.path.join(
    os.path.expanduser("~"), "Downloads", "Combination Resume Template.docx"
)


def _load(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


# ---------------------------------------------------------------------------
# Chronological template tests
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not os.path.exists(CHRONOLOGICAL), reason="Template file not found")
class TestChronologicalTemplate:
    def setup_method(self):
        self.resume = parse_resume(_load(CHRONOLOGICAL))

    def test_returns_parsed_resume(self):
        assert isinstance(self.resume, ParsedResume)

    def test_candidate_name_extracted(self):
        assert self.resume.candidate_name != ""
        print(f"\nCandidate name: {self.resume.candidate_name}")

    def test_has_sections(self):
        assert len(self.resume.sections) > 0

    def test_has_experience_section(self):
        exp = [s for s in self.resume.sections if s.section_type == "experience"]
        assert len(exp) >= 1, "No experience section found"

    def test_experience_has_jobs(self):
        exp = next(s for s in self.resume.sections if s.section_type == "experience")
        assert len(exp.jobs) >= 1, "No jobs found in experience section"
        for job in exp.jobs:
            print(f"\n  Job: {job.title} @ {job.company} ({job.date_range})")
            print(f"    Bullets: {len(job.bullets)}")

    def test_jobs_have_bullets(self):
        exp = next(s for s in self.resume.sections if s.section_type == "experience")
        for job in exp.jobs:
            assert len(job.bullets) > 0, f"Job '{job.title}' has no bullets"

    def test_detected_format_is_chronological(self):
        assert self.resume.detected_format in ("chronological", "unknown"), (
            f"Unexpected format: {self.resume.detected_format}"
        )

    def test_source_styles_captured(self):
        s = self.resume.source_styles
        assert s.page_width_inches is not None
        assert s.page_height_inches is not None

    def test_section_order_preserved(self):
        orders = [s.original_order for s in self.resume.sections]
        assert orders == sorted(orders), "Section original_order is not sequential"

    def test_no_empty_section_headings_in_named_sections(self):
        # Only the implicit contact section may have an empty heading
        named = [s for s in self.resume.sections if s.section_type != "contact"]
        for s in named:
            assert s.heading != "", f"Section with type '{s.section_type}' has empty heading"

    def test_bullet_text_not_empty(self):
        for section in self.resume.sections:
            for job in section.jobs:
                for bullet in job.bullets:
                    assert bullet.text.strip() != "", "Empty bullet text found"

    def test_print_full_tree(self, capsys):
        """Print the full parsed tree for visual inspection."""
        _print_tree(self.resume)


# ---------------------------------------------------------------------------
# Combination template tests
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not os.path.exists(COMBINATION), reason="Template file not found")
class TestCombinationTemplate:
    def setup_method(self):
        self.resume = parse_resume(_load(COMBINATION))

    def test_returns_parsed_resume(self):
        assert isinstance(self.resume, ParsedResume)

    def test_candidate_name_extracted(self):
        assert self.resume.candidate_name != ""
        print(f"\nCandidate name: {self.resume.candidate_name}")

    def test_has_sections(self):
        assert len(self.resume.sections) > 0

    def test_has_skills_section(self):
        skills = [s for s in self.resume.sections if s.section_type == "skills"]
        assert len(skills) >= 1, "No skills section found"

    def test_skills_have_content(self):
        skills = next(s for s in self.resume.sections if s.section_type == "skills")
        total = len(skills.free_paragraphs) + sum(len(j.bullets) for j in skills.jobs)
        assert total > 0, "Skills section is empty"

    def test_print_full_tree(self, capsys):
        _print_tree(self.resume)


# ---------------------------------------------------------------------------
# Shared edge case tests
# ---------------------------------------------------------------------------

def test_empty_file_raises():
    with pytest.raises(Exception):
        parse_resume(b"")


def test_non_docx_bytes_raises():
    with pytest.raises(Exception):
        parse_resume(b"this is not a docx file at all")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _print_tree(resume: ParsedResume) -> None:
    print(f"\n{'='*60}")
    print(f"Resume: {resume.candidate_name}")
    print(f"Format: {resume.detected_format}")
    print(f"Styles: {resume.source_styles}")
    if resume.parse_warnings:
        for w in resume.parse_warnings:
            print(f"  WARNING: {w}")
    print()
    for section in resume.sections:
        print(f"  [{section.section_type.upper()}] {section.heading!r}")
        for job in section.jobs:
            print(f"    JOB: {job.title!r} @ {job.company!r} | {job.date_range}")
            for b in job.bullets:
                print(f"      • {b.text[:80]}")
        for fp in section.free_paragraphs:
            print(f"    > {fp.text[:80]}")
    print("="*60)
