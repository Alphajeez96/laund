import logging
import threading
from pathlib import Path

from faster_whisper import WhisperModel

from app.models import Segment

logger = logging.getLogger(__name__)


class Transcriber:
    def __init__(self, model_size: str, device: str, compute_type: str, download_root: str = ""):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.download_root = download_root
        self._model: WhisperModel | None = None
        self._lock = threading.Lock()
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def _ensure_model(self):
        if self._loaded:
            return
        with self._lock:
            if self._loaded:
                return
            logger.info(
                "Loading model %s (device=%s, compute_type=%s)",
                self.model_size,
                self.device,
                self.compute_type,
            )
            kwargs = {}
            if self.download_root:
                kwargs["download_root"] = self.download_root
            self._model = WhisperModel(
                self.model_size, device=self.device, compute_type=self.compute_type, **kwargs
            )
            self._loaded = True
            logger.info("Model loaded successfully")

    def transcribe(self, audio_path: str | Path) -> dict:
        self._ensure_model()
        logger.info("Transcribing %s", audio_path)
        segments, info = self._model.transcribe(str(audio_path))

        text_parts: list[str] = []
        segment_list: list[Segment] = []

        for seg in segments:
            text_parts.append(seg.text.strip())
            segment_list.append(
                Segment(start=round(seg.start, 2), end=round(seg.end, 2), text=seg.text.strip())
            )

        full_text = " ".join(text_parts)
        logger.info(
            "Transcription complete (%d segments, %.2fs audio)",
            len(segment_list),
            info.duration,
        )

        return {
            "text": full_text,
            "language": info.language,
            "duration_seconds": round(info.duration, 2) if info.duration else None,
            "segments": [s.model_dump() for s in segment_list],
        }
