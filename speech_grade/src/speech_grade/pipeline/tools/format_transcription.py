from speech_grade.pipeline.types import TranscriptionSentence as TranscriptionSentenceType
from openai.types.audio import TranscriptionWord
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from more_itertools import chunked

from pydantic import BaseModel, Field

def format_transcription(transcription_words: List[TranscriptionWord]) -> List[TranscriptionSentenceType]:

    result = []
    for words_chunk in chunked(transcription_words, 7):
        result.append(TranscriptionSentenceType(
            sentence=" ".join([word.word for word in words_chunk]),
            sentence_start=words_chunk[0].start,
        ))

    return result