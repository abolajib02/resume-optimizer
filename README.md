# Resume Optimizer

A full-stack web application that parses a master `.docx` resume, analyses it against a job description using Claude AI, and lets you tailor the content down to a one- or two-page optimized document — all without touching a word processor.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Local Development Setup](#local-development-setup)
7. [Running the App](#running-the-app)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [How It Works](#how-it-works)
11. [Docker Deployment](#docker-deployment)
12. [DevOps & Tooling](#devops--tooling)
13. [Known Limitations](#known-limitations)

---

## Features

| Feature | Description |
|---|---|
| **Resume Parsing** | Uploads a `.docx` file and converts it into a structured tree of sections, jobs, projects, skills, and bullets — preserving all original formatting |
| **AI Analysis** | Sends the resume and job description to Claude (claude-3-5-sonnet) which scores every section, job, and bullet for relevance and recommends what to keep, deprioritize, or remove |
| **ATS Keyword Coverage** | Extracts keywords from the job description using NLTK and shows which ones your resume already covers |
| **Format Recommendation** | Claude recommends Chronological vs. Combination format based on the role and your background |
| **Interactive Tree Editor** | Left panel shows the full resume hierarchy — drag sections and jobs to reorder, toggle checkboxes to include/exclude any item |
| **Live Preview** | Right panel renders the resume exactly as it will look when downloaded, scaled to fit the screen |
| **Page Overflow Detection** | Real-time indicator showing how many pixels over the page limit the content is, with suggestions for what to cut |
| **Inline Editing** | Click any text in the preview to edit it directly |
| **Formatting Controls** | Toolbar to switch format (Chronological / Combination), set page limit (1 or 2 pages), adjust font size and margins |
| **Download** | Exports a `.docx` file that faithfully reconstructs the resume with your selections, reordering, and edits applied |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   ┌──────────────┐          ┌───────────────────────┐   │
│   │  Tree Panel  │          │    Preview Panel      │   │
│   │  (sections,  │          │  (live DOCX render,   │   │
│   │  jobs, drag) │          │   inline editing)     │   │
│   └──────┬───────┘          └───────────┬───────────┘   │
│          │         Redux Store          │               │
│          └─────────────┬───────────────┘               │
│                        │                               │
│              React + Vite + TypeScript                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (fetch)
                         │
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                        │
│                                                         │
│  POST /api/parse    →  parser.py  →  ParsedResume JSON  │
│  POST /api/analyze  →  analyzer.py →  task_id           │
│  GET  /api/analyze/{id}/status  →  poll for results     │
│  POST /api/download →  reconstructor.py  →  .docx bytes │
│                                                         │
│              Python 3.12 + uvicorn                      │
└────────────────────────┬────────────────────────────────┘
                         │ async SDK
                         │
              ┌──────────▼──────────┐
              │   Anthropic API     │
              │  claude-3-5-sonnet  │
              └─────────────────────┘
```

**Data flow for a resume upload:**

1. User drops a `.docx` → `POST /api/parse` → backend parses the document into a JSON tree of sections, jobs, bullets, and formatting metadata
2. Frontend stores the tree in Redux and renders it simultaneously in the tree panel and preview panel
3. In the background, `POST /api/analyze` fires the Claude analysis as a FastAPI `BackgroundTask`
4. Frontend polls `GET /api/analyze/{id}/status` every 2 seconds until the result arrives
5. On completion, the analysis result is applied: low-relevance items are unchecked, the format modal appears if Claude recommends a different format
6. User makes selections/edits → `POST /api/download` → backend reconstructs the `.docx` → file saves to disk

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | REST API framework |
| uvicorn | 0.30 | ASGI server |
| python-docx | 1.1 | DOCX parsing and reconstruction |
| anthropic | 0.34 | Claude AI SDK (async) |
| pydantic / pydantic-settings | 2.9 | Data models and config |
| NLTK | 3.9 | Keyword extraction from job descriptions |
| pytest + httpx | 8.3 / 0.27 | Testing |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5.4 | Dev server and bundler |
| Redux Toolkit | 2.11 | State management |
| @dnd-kit | 6.3 / 10.0 | Drag-and-drop for section/job reordering |
| react-resizable-panels | 4.10 | Resizable layout panels |

### DevOps
| Tool | Purpose |
|---|---|
| GitHub Actions | CI — lint, type-check, build on every push/PR |
| Docker + nginx | Containerized production deployment |
| pre-commit | Local hooks — ruff (Python), ESLint (TypeScript), file hygiene |
| ruff | Python linting and formatting |
| mypy | Python static type checking |

---

## Project Structure

```
resume-optimizer/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI pipeline (backend + frontend jobs)
├── .pre-commit-config.yaml     # Pre-commit hooks
├── docker-compose.yml          # Production container orchestration
├── .env.example                # Environment variable template
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # + ruff, mypy, pre-commit
│   ├── pyproject.toml          # ruff and mypy configuration
│   └── app/
│       ├── main.py             # FastAPI app, routes, background tasks
│       ├── config.py           # Settings (API key, CORS, upload limits)
│       ├── models/
│       │   ├── resume.py       # ParsedResume, Section, Job, Bullet models
│       │   ├── analysis.py     # AnalysisResult, SectionScore, BulletScore
│       │   └── request.py      # DownloadRequest, ParseResponse
│       ├── services/
│       │   ├── parser.py       # DOCX → ParsedResume (6-stage pipeline)
│       │   ├── analyzer.py     # Claude AI analysis (tool_use API)
│       │   ├── reconstructor.py# ParsedResume + selections → DOCX bytes
│       │   └── keyword_matcher.py # NLTK keyword extraction + ATS matching
│       ├── prompts/
│       │   └── analysis.py     # Claude system prompt and tool schemas
│       └── utils/
│           └── docx_helpers.py # Low-level python-docx helpers
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # SPA routing + /api proxy to backend
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx            # React entry point (Redux Provider)
        ├── App.tsx             # Root — upload vs workspace routing
        ├── index.css
        ├── api/
        │   └── client.ts       # fetch wrappers for all API endpoints
        ├── store/
        │   ├── index.ts        # Redux store setup
        │   ├── resumeSlice.ts  # Resume tree, selections, reordering
        │   ├── analysisSlice.ts# Analysis status + results
        │   └── uiSlice.ts      # Step, format, toolbar settings
        ├── types/
        │   └── resume.ts       # TypeScript mirrors of backend Pydantic models
        ├── hooks/
        │   ├── useAnalysisPoller.ts  # Polls analysis status, auto-applies results
        │   ├── useFormatReorder.ts   # Re-sorts sections when format changes
        │   └── usePageOverflow.ts    # Detects when content exceeds page limit
        └── components/
            ├── upload/
            │   └── UploadPanel.tsx   # Landing page — file drop + job description
            ├── toolbar/
            │   └── FormattingToolbar.tsx  # Format, page limit, font, margins, download
            ├── tree/
            │   ├── ResumeTree.tsx    # Outer DnD context, section list
            │   ├── SectionNode.tsx   # Section card with inner DnD context for jobs
            │   ├── JobNode.tsx       # Job/project/skill-group card with drag handle
            │   ├── BulletNode.tsx    # Individual bullet with visibility checkbox
            │   └── FreeParagraphNode.tsx  # Non-job content with checkbox
            ├── preview/
            │   ├── ResumePreview.tsx # Scaled page canvas + overflow banner
            │   ├── PageCanvas.tsx    # White paper sheet, page-limit enforcement
            │   └── RenderedResume.tsx# Renders resume data as styled HTML/CSS
            ├── analysis/
            │   ├── AnalysisBanner.tsx# Status bar — spinner → match score
            │   └── FormatModal.tsx   # Format recommendation confirmation dialog
            └── shared/
                └── ScoreBadge.tsx   # Relevance % badge shown on tree nodes
```

---

## Prerequisites

- **Python 3.12+**
- **Node.js 20+** and npm
- **An Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- *(Optional for Docker)* Docker Desktop

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/abolajib02/resume-optimizer.git
cd resume-optimizer
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Open .env and set your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Set up the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements-dev.txt

# Download NLTK data (one-time)
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

### 4. Set up the frontend

```bash
cd ../frontend
npm install
```

### 5. (Optional) Install pre-commit hooks

```bash
cd ..   # back to project root
pip install pre-commit
pre-commit install
```

---

## Running the App

Open **two terminals** — one for each service.

### Terminal 1 — Backend

```bash
cd backend
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag watches Python files and restarts automatically when you save changes.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **When do I need to restart?**
> - **Backend changes** (`.py` files): auto-reloaded when using `--reload`
> - **Frontend changes** (`.tsx`/`.ts`/`.css`): hot-reloaded by Vite automatically
> - No restart needed for most changes during development

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key for Claude access |
| `CORS_ORIGINS` | No | `["http://localhost:5173"]` | Allowed CORS origins (JSON array string) |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | Maximum resume file size in megabytes |

Create a `.env` file in the **project root** (next to `docker-compose.yml`) for Docker, or in **`backend/`** for local development.

---

## API Reference

All endpoints are served by the FastAPI backend at `http://localhost:8000`.

Interactive API docs are available at `http://localhost:8000/docs` when the backend is running.

### `POST /api/parse`

Parses an uploaded `.docx` resume into a structured JSON tree.

**Request:** `multipart/form-data` with a `file` field containing the `.docx` file.

**Response:**
```json
{
  "resume": {
    "id": "uuid",
    "candidate_name": "Jane Smith",
    "sections": [ ... ],
    "detected_format": "chronological",
    "source_styles": { ... },
    "parse_warnings": []
  }
}
```

---

### `POST /api/analyze`

Starts an asynchronous AI analysis of the resume against a job description.

**Request:**
```json
{
  "resume": { /* ParsedResume object from /api/parse */ },
  "job_description": "We are looking for a senior software engineer..."
}
```

**Response:**
```json
{ "task_id": "uuid" }
```

---

### `GET /api/analyze/{task_id}/status`

Polls the status of an analysis task.

**Response:**
```json
{
  "status": "pending | complete | error",
  "result": { /* AnalysisResult — present when status is complete */ },
  "error": "error message — present when status is error"
}
```

---

### `POST /api/download`

Reconstructs the resume as a `.docx` file applying all user selections, reordering, and inline edits.

**Request:**
```json
{
  "resume": { /* ParsedResume */ },
  "selection": { "section-id": true, "bullet-id": false },
  "section_order": ["id1", "id2"],
  "job_order": { "section-id": ["job-id1", "job-id2"] },
  "bullet_order": { "job-id": ["bullet-id1"] },
  "settings": {
    "format": "chronological",
    "page_limit": 1,
    "font_size_pt": 11,
    "margins_inches": { "top": 0.75, "bottom": 0.75, "left": 1.0, "right": 1.0 }
  },
  "inline_edits": { "bullet-id": "edited text" },
  "skill_groups": null
}
```

**Response:** Binary `.docx` file download.

---

### `GET /health`

Returns `{"status": "ok"}` — used by Docker healthchecks.

---

## How It Works

### Resume Parsing Pipeline (6 stages)

The parser in `backend/app/services/parser.py` processes a `.docx` file through six stages:

| Stage | What happens |
|---|---|
| **1 — Style extraction** | Captures document-level defaults: font, page size, margins |
| **2 — Table detection** | Warns if the resume uses tables/text boxes for layout (reduces parse accuracy) |
| **3 — Paragraph classification** | Each paragraph is scored and labeled: `heading`, `bullet`, `date_line`, or `free` |
| **4 — Tree assembly** | Headings create Sections; date lines trigger Job parsing in Experience; bold titles create group entries in Projects/Skills |
| **5 — Format detection** | Heuristic: if a Skills section precedes Experience with sparse bullets → Combination format |
| **6 — Name extraction** | The first non-empty heading or paragraph (without @ or phone digits) is the candidate name |

**Heading detection scoring** — a paragraph becomes a section heading when it accumulates ≥ 2 points from:
- Word style is `Heading X` → +3
- All-caps, ≤ 6 words, no sentence punctuation → +2
- Font size ≥ body size + 1.5pt → +2
- Bold and ≤ 5 words → +1
- Has a paragraph bottom border → +2
- Text contains a known section keyword → +2 *(prevents bold content lines from being misclassified)*
- Any run is underlined → +2 *(the strongest signal for this resume's formatting style)*

### AI Analysis Pipeline

The analyzer in `backend/app/services/analyzer.py` calls Claude using the [tool_use](https://docs.anthropic.com/en/docs/tool-use) API for structured output:

1. **Keyword extraction** — NLTK extracts significant noun phrases from the job description (max 40 keywords)
2. **ATS coverage** — stem-matched keywords are checked against the full resume text
3. **Section/job/bullet scoring** — Claude scores every element 0–1 for relevance and assigns a recommendation (`keep`, `deprioritize`, `remove`)
4. **Format recommendation** — Claude recommends Chronological or Combination with a confidence score and rationale
5. **Skill synthesis** *(Combination format only)* — a second Claude call groups skills into thematic categories

### Drag-and-Drop Architecture

The tree uses [dnd-kit](https://dndkit.com/) with **nested, isolated `DndContext` instances**:

- **Outer context** (`ResumeTree`) — handles section reordering
- **Inner context** (`SectionNode`) — handles job/entry reordering within a section

Jobs cannot be dragged between sections because each section's `DndContext` is independent. Bullets and free paragraphs are intentionally **not draggable** — they are locked to their parent job.

`MouseSensor` + `TouchSensor` are used instead of `PointerSensor` to avoid known incompatibilities with `overflow: auto` scroll containers.

---

## Docker Deployment

The project ships with a production-ready Docker Compose configuration using a multi-stage build.

### Build and run

```bash
# From the project root
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

docker compose up --build
```

The app will be available at [http://localhost](http://localhost).

### How the containers work

| Container | Base image | What it does |
|---|---|---|
| `backend` | `python:3.12-slim` | Runs `uvicorn app.main:app` on port 8000; NLTK data is baked into the image |
| `frontend` | `node:20-alpine` → `nginx:1.27-alpine` | Multi-stage: Node builds the Vite bundle, nginx serves the static files and proxies `/api/*` to the backend |

The nginx proxy eliminates CORS entirely in production — the browser only ever talks to one origin.

---

## DevOps & Tooling

### CI Pipeline (GitHub Actions)

Every push and pull request runs two parallel jobs defined in `.github/workflows/ci.yml`:

```
backend job                    frontend job
──────────────                 ───────────────
pip install                    npm ci
ruff check (lint)              npm run lint (ESLint)
mypy (type check)              npx tsc --noEmit
pytest                         npm run build
```

### Pre-commit Hooks

Install once with `pre-commit install`. The following hooks run on every `git commit`:

| Hook | What it checks |
|---|---|
| `trailing-whitespace` | No trailing spaces |
| `end-of-file-fixer` | Files end with a newline |
| `check-yaml` | Valid YAML |
| `check-json` | Valid JSON |
| `check-merge-conflict` | No unresolved merge markers |
| `check-added-large-files` | No files > 1 MB accidentally committed |
| `ruff` | Python linting (auto-fix) |
| `ruff-format` | Python formatting (auto-fix) |
| `eslint --fix` | TypeScript linting (auto-fix) |

### Disabling AI Analysis (credit preservation)

If your Anthropic credits run out, you can disable analysis without losing any other functionality. In `frontend/src/components/upload/UploadPanel.tsx`, comment out the three blocks marked `// re-enable with analysis`. Resume parsing, tree editing, preview, and download all continue to work.

---

## Known Limitations

| Limitation | Detail |
|---|---|
| **Multi-column layouts** | Resumes using tables or text boxes for layout (common in heavily designed templates) are linearized left-to-right, which may scramble the content order. A parse warning is shown. |
| **In-memory task store** | Analysis tasks are stored in a Python dict — tasks are lost if the backend restarts. Suitable for single-server deployments; replace with Redis for multi-instance setups. |
| **Stateless download** | The full resume JSON is sent with every download request. For very long resumes this is slightly inefficient but avoids the need for server-side session storage. |
| **DOCX format only** | PDF and other formats are not supported. Most word processors can export to `.docx`. |
| **Heading detection heuristics** | The parser uses signal scoring to detect section headings. Unconventional resume formatting (no bold/underline/all-caps headings) may cause sections to not be detected correctly. |
