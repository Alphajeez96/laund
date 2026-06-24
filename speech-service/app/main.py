import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi import File as FastAPIFile

from app.config import settings
from app.models import HealthResponse, TranscribeResponse, TranscribeURLRequest
from app.transcriber import Transcriber

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(asctime)s  %(levelname)-8s %(name)s  %(message)s",
    )
    logger.info("Starting STT service with model=%s", settings.model_size)
    app.state.transcriber = Transcriber(
        model_size=settings.model_size,
        device=settings.device,
        compute_type=settings.compute_type,
        download_root=settings.download_root,
    )
    yield
    logger.info("Shutting down STT service")


app = FastAPI(
    title="LaundryOps STT",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health():
    transcriber: Transcriber = app.state.transcriber
    return HealthResponse(
        status="ok",
        model=settings.model_size,
        model_loaded=transcriber.is_loaded,
    )


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = FastAPIFile(...)):
    suffix = Path(file.filename or "audio.wav").suffix if file.filename else ".wav"
    if not suffix:
        suffix = ".wav"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        result = app.state.transcriber.transcribe(tmp_path)
        return TranscribeResponse(**result)
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.post("/transcribe-url", response_model=TranscribeResponse)
async def transcribe_url(body: TranscribeURLRequest):
    suffix = Path(body.audio_url).suffix or ".wav"

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(body.audio_url)
            response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        result = app.state.transcriber.transcribe(tmp_path)
        return TranscribeResponse(**result)
    except httpx.HTTPStatusError as exc:
        logger.exception("Failed to download audio from URL")
        raise HTTPException(status_code=502, detail=f"Failed to download audio: {exc}") from exc
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def main():
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
    )


if __name__ == "__main__":
    main()
