from speech_grade.pipeline.types import Event
from openai.types.audio import TranscriptionWord
from typing import List, Literal, get_args
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from typing import Optional

from pydantic import BaseModel, Field

class Transcription(BaseModel):
    readable_transcription: str = Field(..., description="Transcription with ASR errors fixed and proper punctuation")

def convert_transcript_to_text(transcription_words: List[TranscriptionWord]) -> str:
    model = ChatOpenAI(model="gpt-4o")

    id_to_word = {i+1: word for i, word in enumerate(transcription_words)}

    transcription_formatted = "\n".join([
        f"Word id: {i}, word: {word.word}" for i, word in id_to_word.items()
    ])

    parser = PydanticOutputParser(pydantic_object=Transcription)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Your task is to convert output of ASR to text with ASR errors fixed and proper punctuation.\n{output_format}"),
        ("user", "{transcription_formatted}"),
    ])

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {
        "output_format": parser.get_format_instructions()
    }

    chain = prompt | model | parser

    result: Transcription = chain.invoke({
        "transcription_formatted": transcription_formatted,
    })

    return result.readable_transcription
