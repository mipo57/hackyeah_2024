from speech_grade.pipeline.types import Event
from openai.types.audio import TranscriptionWord
from typing import List, Literal, get_args
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from typing import Optional

from pydantic import BaseModel, Field


class Translation(BaseModel):
    translation: str = Field(..., description="Translation of the transcription to english.")

def translate_to_english(text: str) -> str:
    model = ChatOpenAI(model="gpt-4o")

    parser = PydanticOutputParser(pydantic_object=Translation)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Your task is to translate the text to english.\n{output_format}"),
        ("user", "{text}"),
    ])

    prompt.input_variables = ["text"]
    prompt.partial_variables = {
        "output_format": parser.get_format_instructions()
    }

    chain = prompt | model | parser

    result: Translation = chain.invoke({
        "text": text,
    })

    return result.translation
