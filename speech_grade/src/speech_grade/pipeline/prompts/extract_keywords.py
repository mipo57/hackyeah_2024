from openai.types.audio import TranscriptionWord
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser


from pydantic import BaseModel, Field


class Keywords(BaseModel):
    keywords: List[str] = Field(
        ...,
        description="List of keywords best describing the content of the transcript",
    )


def extract_keywords(transcription_words: List[TranscriptionWord]) -> List[str]:
    model = ChatOpenAI(model="gpt-4o")

    transcription_formatted = " ".join([word.word for word in transcription_words])

    parser = PydanticOutputParser(pydantic_object=Keywords)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Your task is to generate keywords describing the content of the transcript (from 4 to 6). Keywords should be short, simple, unique and not related to each other.\n{output_format}",
            ),
            ("user", "{transcription_formatted}"),
        ]
    )

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {"output_format": parser.get_format_instructions()}

    chain = prompt | model | parser

    result: Keywords = chain.invoke(
        {
            "transcription_formatted": transcription_formatted,
        }
    )

    return result.keywords
