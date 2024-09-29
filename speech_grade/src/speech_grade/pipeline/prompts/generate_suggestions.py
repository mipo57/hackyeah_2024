from speech_grade.pipeline.types import Event
from openai.types.audio import TranscriptionWord
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser


from pydantic import BaseModel, Field


class Suggestions(BaseModel):
    suggestions: List[str] = Field(
        ..., description="Suggestions for the speaker on how to improve the speech."
    )


def generate_suggestions(
    transcription_words: List[TranscriptionWord], events: List[Event]
) -> List[str]:
    model = ChatOpenAI(model="gpt-4o")

    events_set = set()
    for event in events:
        events_set.add(event["event"])

    problems_formatted = "\n".join([f"- {event}" for event in events_set])

    transcription_formatted = " ".join([word.word for word in transcription_words])

    parser = PydanticOutputParser(pydantic_object=Suggestions)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Your task is to generate suggestions for the speaker on how to improve the speech based on the events that occurred during the speech and the transcription. The suggestions must be in Polish. Generate between 2 and 4 suggestions.\n{output_format}",
            ),
            (
                "user",
                "Transcription:\n{transcription_formatted}\n\Problems found:\n{problems_formatted}",
            ),
        ]
    )

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {"output_format": parser.get_format_instructions()}

    chain = prompt | model | parser

    result: Suggestions = chain.invoke(
        {
            "transcription_formatted": transcription_formatted,
            "problems_formatted": problems_formatted,
        }
    )

    return result.suggestions
