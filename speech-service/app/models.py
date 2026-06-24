from pydantic import BaseModel


class TranscribeURLRequest(BaseModel):
    audio_url: str


class Segment(BaseModel):
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    text: str
    language: str | None = None
    duration_seconds: float | None = None
    segments: list[Segment] = []


class HealthResponse(BaseModel):
    status: str
    model: str
    model_loaded: bool = False
