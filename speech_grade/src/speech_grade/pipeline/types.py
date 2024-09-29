from typing import TypedDict
from typing_extensions import TypedDict


class Event(TypedDict):
    start_s: float
    end_s: float
    event: str
    description: str
    color: str


class TranscriptionSentence(TypedDict):
    sentence_start: float
    sentence: str
