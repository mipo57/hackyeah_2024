from openai.types.audio import TranscriptionWord
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser


from pydantic import BaseModel, Field


class Questions(BaseModel):
    questions: List[str] = Field(..., description="Questions to the speaker.")


def generate_questions(transcription_words: List[TranscriptionWord]) -> str:
    model = ChatOpenAI(model="gpt-4o")

    id_to_word = {i + 1: word for i, word in enumerate(transcription_words)}

    transcription_formatted = "\n".join(
        [f"Word id: {i}, word: {word.word}" for i, word in id_to_word.items()]
    )

    parser = PydanticOutputParser(pydantic_object=Questions)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Your task is to generate questions that listener could ask to the speaker based on the transcription. The questions must be in Polish and must be about something related to the content of the speech, but not answerable from the speech itself. Generate 10 questions.\n{output_format}",
            ),
            ("user", "{transcription_formatted}"),
        ]
    )

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {"output_format": parser.get_format_instructions()}

    chain = prompt | model | parser

    result: Questions = chain.invoke(
        {
            "transcription_formatted": transcription_formatted,
        }
    )

    return result.questions
