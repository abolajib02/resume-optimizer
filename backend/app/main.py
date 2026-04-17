import uuid
from io import BytesIO
from typing import Any, Literal

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.models.analysis import AnalysisResult
from app.models.request import DownloadRequest, ParseResponse
from app.services.analyzer import analyze_resume
from app.services.parser import parse_resume
from app.services.reconstructor import reconstruct_resume

app = FastAPI(title="Resume Optimizer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)
_MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024

# ---------------------------------------------------------------------------
# In-memory task store  (key: task_id, value: task record dict)
# ---------------------------------------------------------------------------
# Shape: { status: "pending"|"complete"|"error", result?: AnalysisResult, error?: str }
_TASKS: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    resume: dict        # ParsedResume as raw dict (avoids double-parsing)
    job_description: str


class AnalyzeTaskResponse(BaseModel):
    task_id: str


class AnalyzeStatusResponse(BaseModel):
    status: Literal["pending", "complete", "error"]
    result: AnalysisResult | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Parse
# ---------------------------------------------------------------------------

@app.post("/api/parse", response_model=ParseResponse)
async def parse(file: UploadFile = File(...)) -> ParseResponse:
    if file.content_type and file.content_type not in (
        _DOCX_MIME, "application/octet-stream"
    ):
        raise HTTPException(status_code=415, detail="Only .docx files are supported.")

    file_bytes = await file.read()

    if len(file_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb} MB.",
        )

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        resume = parse_resume(file_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Could not parse the document: {exc}"
        ) from exc

    return ParseResponse(resume=resume)


# ---------------------------------------------------------------------------
# Analyze (async background task + polling)
# ---------------------------------------------------------------------------

async def _run_analysis(task_id: str, request: AnalyzeRequest) -> None:
    """Background coroutine: runs analysis and writes result to _TASKS."""
    from app.models.resume import ParsedResume

    try:
        resume = ParsedResume.model_validate(request.resume)
        result = await analyze_resume(resume, request.job_description)
        _TASKS[task_id] = {"status": "complete", "result": result}
    except Exception as exc:
        _TASKS[task_id] = {"status": "error", "error": str(exc)}


@app.post("/api/analyze", response_model=AnalyzeTaskResponse)
async def start_analyze(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> AnalyzeTaskResponse:
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description must not be empty.")

    task_id = str(uuid.uuid4())
    _TASKS[task_id] = {"status": "pending"}

    # FastAPI BackgroundTasks runs after the response is sent.
    # We wrap the async coroutine so it runs on the event loop.
    background_tasks.add_task(_run_analysis, task_id, request)

    return AnalyzeTaskResponse(task_id=task_id)


@app.get("/api/analyze/{task_id}/status", response_model=AnalyzeStatusResponse)
async def get_analyze_status(task_id: str) -> AnalyzeStatusResponse:
    task = _TASKS.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    return AnalyzeStatusResponse(
        status=task["status"],
        result=task.get("result"),
        error=task.get("error"),
    )


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

@app.post("/api/download")
async def download(request: DownloadRequest) -> StreamingResponse:
    try:
        docx_bytes = reconstruct_resume(request)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Could not reconstruct resume: {exc}"
        ) from exc

    return StreamingResponse(
        BytesIO(docx_bytes),
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ),
        headers={"Content-Disposition": "attachment; filename=optimized_resume.docx"},
    )
