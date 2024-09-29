from openai.types.audio import TranscriptionWord
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser


from pydantic import BaseModel, Field


class TargetGroup(BaseModel):
    target_group: str = Field(
        ...,
        description="Description of the target group of the video in polish language.",
    )


def extract_target_group(transcription_words: List[TranscriptionWord]) -> str:
    model = ChatOpenAI(model="gpt-4o")

    transcription_formatted = " ".join([word.word for word in transcription_words])

    parser = PydanticOutputParser(pydantic_object=TargetGroup)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Your task is to describe the target group of the video in polish language. Focus on education level and age. Be concise (max 2 sentences).\n{output_format}",
            ),
            ("user", "{transcription_formatted}"),
        ]
    )

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {"output_format": parser.get_format_instructions()}

    chain = prompt | model | parser

    result: TargetGroup = chain.invoke(
        {
            "transcription_formatted": transcription_formatted,
        }
    )

    return result.target_group
