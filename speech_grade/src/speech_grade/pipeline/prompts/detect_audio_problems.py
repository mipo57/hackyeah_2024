from speech_grade.pipeline.types import Event
from openai.types.audio import TranscriptionWord
from typing import List, Literal, get_args
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from typing import Optional

from pydantic import BaseModel, Field

PROBLEM_CLASS = Literal[
    "filler_words",
    "repetitions",
    "parenthetical_remarks",
    "topic_change",
    "excessive_numbers",
    "complex_language",
    "jargon",
    "foreign_language",
    "long_pause",
    "incorrect_words",
    "passive_voice",
]

problem_classes = get_args(PROBLEM_CLASS)

class_descriptions = {
    "filler_words": "Filler words are words that are used to fill the gap between words or phrases, such as 'yyyy', 'aaaa', or 'hmmm' etc.. They are often used to buy time or to think of the next word.",
    "repetitions": "Repetitions are phrases that are repeated multiple times (overused) in speech. They can be distracting to the listener and can be a sign of hesitation or uncertainty.",
    "parenthetical_remarks": "Parenthetical remarks are remarks that are made in the middle of a speech that break the flow of the speech and may cause confusion.",
    "topic_change": "Topic change is when the speaker abroubtly changes the topic of he is talking about.",
    "excessive_numbers": "Excessive numbers is situation when speaker fluds the listiner with a lot of numbers. Don't count every number as a problem, only if eg. speaker says like 3 or 4 unrelated numbers in row. Don't count numbers like Act 1.2 as multiple numbers, just one.",
    "complex_language": "Complex language is using words that will difficult to understand for average person, like some lawyer words.",
    "jargon": "Jargon is language that is specific to a particular field or industry. It can be difficult to understand for someone who is not familiar with the field or industry.",
    "foreign_language": "Speaker is saying words that are not in Polish..",
    "long_pause": "Long pause is a pause that is longer than usual.",
    "incorrect_words": "Incorrect words are words that are said incorrectly.",
    "passive_voice": "Passive voice is when the speaker uses the passive voice to describe an action.",
}

class_pl_names = {
    "filler_words": "Słowa wypełniające",
    "repetitions": "Powtórzenia",
    "parenthetical_remarks": "Wtrącenia",
    "topic_change": "Zmiana tematu",
    "excessive_numbers": "Duża ilość liczb",
    "complex_language": "Skomplikowana mowa",
    "jargon": "Żargon",
    "foreign_language": "Mowa obca",
    "long_pause": "Długa przerwa",
    "incorrect_words": "Błędne słowa",
    "passive_voice": "Mowa bierna",
}

# const colors = [
#     '#FFA500', // Orange
#     '#4CAF50', // Green
#     '#2196F3', // Blue
#     '#9C27B0', // Purple
#     '#F44336', // Red
#     '#FF9800', // Dark Orange
#     '#8BC34A', // Light Green
#     '#03A9F4', // Light Blue
#     '#E91E63', // Pink
#     '#FF5722', // Deep Orange
#     '#009688', // Teal
#     '#3F51B5', // Indigo
#     '#FFEB3B', // Yellow
#     '#795548', // Brown
#     '#607D8B', // Blue Grey
#     '#00BCD4', // Cyan
#     '#FFC107', // Amber
#     '#673AB7', // Deep Purple
#     '#CDDC39', // Lime
#     '#9E9E9E'  // Grey
#   ];

class_colors = {
    "filler_words": '#FFA500',  # Orange
    "repetitions": '#4CAF50',   # Green
    "parenthetical_remarks": '#CDDC39',  # Lime
    "topic_change": '#2196F3',  # Blue
    "excessive_numbers": '#9C27B0',  # Purple
    "complex_language": '#F44336',  # Red
    "jargon": '#FF9800',  # Dark Orange
    "foreign_language": '#8BC34A',  # Light Green
    "long_pause": '#03A9F4',  # Light Blue
    "incorrect_words": '#E91E63',  # Pink
    "passive_voice": '#FF5722',  # Deep Orange
}

class_pl_problem_description = {
    "filler_words": "Słowa wypełniające są słowami, które są używane do wypełnienia przerwy między słowami lub frazami, np. 'um', 'ah', lub 'like'. Często są używane do kupienia czasu lub do znalezienia następnego słowa. Słowa wypełniające nie są konieczne dla znaczenia zdania i mogą być zniechęcające dla słuchacza.",
    "repetitions": "Powtórzenia są słowami lub frazami, które są powtarzane wiele razy w zdaniu. Mogą być zniechęcające dla słuchacza i mogą być znakiem wstrętu lub niepewności.",
    "parenthetical_remarks": "Wtrącenia są słowami lub frazami, które przerywają flow wypowiedzi i mogą zniechęcić słuchacza i sprawić, że będzie mu trudno zrozumieć myśl mówcy.",
    "topic_change": "Zmiana tematu to zmiana tematu konwersacji przez mówcę. Może to być zniechęcające dla słuchacza i może być znakiem braku skupienia mówcy lub organizacji.",
    "excessive_numbers": "Duża ilość liczb to liczby, które są powtarzane wiele razy w zdaniu. Mogą być zniechęcające dla słuchacza i mogą być znakiem braku skupienia mówcy lub organizacji.",
    "complex_language": "Skomplikowana mowa to mowa, która jest trudna do zrozumienia. Może to być znakiem braku skupienia mówcy lub organizacji.",
    "jargon": "Żargon to mowa, która jest specyficzna dla określonego pola lub branży. Może być trudna do zrozumienia dla osób, które nie są zaznajomione z tym polem lub branżą.",
    "foreign_language": "Mowa obca to mowa, która jest używana przez mówcę, która nie jest językiem polskim.",
    "long_pause": "Długa przerwa to przerwa, która jest dłuższa niż zwykle. Może to być znakiem braku skupienia mówcy lub niepewności.",
    "incorrect_words": "Błędne słowa to słowa, które są pisane niepoprawnie. Mogą być zniechęcające dla słuchacza i mogą być znakiem braku skupienia mówcy lub organizacji.",
    "passive_voice": "Mowa bierna to mowa, w której mówca używa mowy biernej do opisu akcji. Może to być znakiem braku skupienia mówcy lub niepewności.",
}

class AudioProblem(BaseModel):
    """Joke to tell user."""
    start_word_id: int = Field(..., description="Id of the first word of the problem")
    end_word_id: int = Field(..., description="Id of the last word of the problem")
    problem_class: PROBLEM_CLASS = Field(..., description="The problem class from the list of problems")

class AudioProblems(BaseModel):
    thinking: str = Field(..., description="Thinking of the problems in the audio. Must be below 100 words.")
    problems: List[AudioProblem] = Field(..., description="List of problems with start and end word id and problem class")

def detect_audio_problems(transcription_words: List[TranscriptionWord]) -> List[Event]:
    model = ChatOpenAI(model="gpt-4o")

    id_to_word = {i+1: word for i, word in enumerate(transcription_words)}

    transcription_formatted = "\n".join([
        f"Word id: {i}, word: {word.word}" for i, word in id_to_word.items()
    ])

    class_descriptions_formatted = "\n".join([
        f"- Class: {problem_class}, description: {class_descriptions[problem_class]}" for problem_class in problem_classes
    ])

    parser = PydanticOutputParser(pydantic_object=AudioProblems)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You will be given a transcription of a video and you will need to detect problems in the audio. Here are possible classes with descriptions:\n{class_descriptions}\nStart with thinking what problems could be in the audio via citing parts. Then you will need to return list of problems with start and end word id and problem class.\n {output_format}"),
        ("user", "{transcription_formatted}"),
    ])

    prompt.input_variables = ["transcription_formatted"]
    prompt.partial_variables = {
        "output_format": parser.get_format_instructions()
    }

    chain = prompt | model | parser

    result: AudioProblems = chain.invoke({
        "transcription_formatted": transcription_formatted,
        "class_descriptions": class_descriptions_formatted
    })

    final_result = []
    for problem in result.problems:
        start_word = id_to_word[problem.start_word_id]
        end_word = id_to_word[problem.end_word_id]
        problem_class = problem.problem_class

        final_result.append(Event(
            start_s=start_word.start,
            end_s=end_word.end,
            event=class_pl_names[problem_class],
            description=class_pl_problem_description[problem_class],
            color=class_colors[problem_class],
        ))

    return final_result
