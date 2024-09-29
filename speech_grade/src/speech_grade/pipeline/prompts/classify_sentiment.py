from speech_grade.pipeline.types import Event
from openai.types.audio import TranscriptionWord
from typing import List, Literal, get_args
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from typing import Optional

from pydantic import BaseModel, Field



class Sentiment(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"] = Field(..., description="Sentiment of the transcription.")

def classify_sentiment(transcription_words: List[TranscriptionWord]) -> str:
    model = ChatOpenAI(model="gpt-4o")

    transcription_formatted = " ".join([word.word for word in transcription_words])

    parser = PydanticOutputParser(pydantic_object=Sentiment)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Your task is to classify the sentiment of the transcription into positive, negative or neutral.\n{output_format}"),
        ("user", "{transcription_formatted}"),
    ])

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {
        "output_format": parser.get_format_instructions()
    }

    chain = prompt | model | parser

    result: Sentiment = chain.invoke({
        "transcription_formatted": transcription_formatted,
    })

    return result.sentiment
