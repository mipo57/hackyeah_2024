from typing import TypedDict, Annotated, List, Tuple
from openai.types.audio import TranscriptionWord
from speech_grade.transcription import transcribe_audio
from speech_grade.convert_video_to_audio import extract_audio_from_mp4
import os
from speech_grade.pipeline.types import Event, TranscriptionSentence
import operator
from speech_grade.pipeline.tools.clarity_score import clarity_score, gunning_fog
from speech_grade.pipeline.prompts.extract_keywords import extract_keywords
from speech_grade.pipeline.prompts.classify_sentiment import classify_sentiment
from speech_grade.pipeline.prompts.ner import extract_named_entities
from speech_grade.pipeline.tools.volume_analisis import analyze_speech_volume
from speech_grade.pipeline.utils import filter_out_short_events
from speech_grade.pipeline.tools.extract_images import extract_frames
from speech_grade.pipeline.prompts.classify_images import classify_image
from langgraph.types import Send
from langgraph.pregel import RetryPolicy
from speech_grade.pipeline.prompts.translate_to_english import translate_to_english
from speech_grade.pipeline.tools.speech_speed import speech_speed
from speech_grade.pipeline.prompts.extract_target_group import extract_target_group
from speech_grade.pipeline.prompts.generate_questions import generate_questions

from typing_extensions import TypedDict
from speech_grade.pipeline.utils import combine_overlapping_events

from langgraph.graph import StateGraph, START, END
from speech_grade.pipeline.prompts.detect_audio_problems import detect_audio_problems
from speech_grade.pipeline.tools.format_transcription import format_transcription
from speech_grade.pipeline.prompts.convert_transcript_to_text import (
    convert_transcript_to_text,
)
from speech_grade.pipeline.prompts.generate_suggestions import generate_suggestions


class State(TypedDict):
    temp_dir: str
    video_path: str
    audio_path: str
    transcription_words: List[TranscriptionWord]
    formatted_transcription: List[TranscriptionSentence]
    readable_transcription: str
    events: Annotated[List[Event], operator.add]
    clarity_score: float
    words_per_minute: List[float]
    words_per_minute_timestamps: List[float]
    avg_words_per_minute: float
    keywords: List[str]
    sentiment: str
    target_group: str
    named_entities: List[str]
    frames_dir_path: str
    place_holder: Annotated[List[str], operator.add]
    fog_index: int
    questions: List[str]
    volumes: List[float]
    volumes_timestamps: List[Tuple[float, float]]
    english_translation: str
    suggestions: List[str]


DEFAULT_RETRY_POLICY = RetryPolicy(max_attempts=3, backoff_factor=2)


def step_extract_audio(state: State) -> State:
    audio_path = os.path.join(state["temp_dir"], "audio.mp3")
    extract_audio_from_mp4(state["video_path"], audio_path)

    return {"audio_path": audio_path}


def step_transcribe_audio(state: State) -> State:
    return {"transcription_words": transcribe_audio(state["audio_path"])}


def step_convert_transcript_to_text(state: State) -> State:
    return {
        "readable_transcription": convert_transcript_to_text(
            state["transcription_words"]
        )
    }


def step_translate_to_english(state: State) -> State:
    return {
        "english_translation": translate_to_english(state["readable_transcription"])
    }


def step_detect_audio_problems(state: State) -> State:
    events = detect_audio_problems(state["transcription_words"])

    return {"events": events}


def step_extract_frames(state: State) -> State:
    frames_dir_path = os.path.join(state["temp_dir"], "frames")
    extract_frames(state["video_path"], frames_dir_path)

    return {"frames_dir_path": frames_dir_path}


def route_classify_image(state: State) -> State:
    files = [
        f
        for f in os.listdir(state["frames_dir_path"])
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".bmp"))
    ]

    print(files)

    return [
        Send(
            "step_classify_image",
            {"image_path": os.path.join(state["frames_dir_path"], image_file)},
        )
        for image_file in files
    ]


class ClassifyImageState(TypedDict):
    image_path: str


def step_classify_image(state: ClassifyImageState) -> State:
    events = classify_image(state["image_path"])

    events = combine_overlapping_events(events)

    return {"events": events}


def step_gather_images(_state: State) -> State:
    return {"place_holder": []}


def step_extract_keywords(state: State) -> State:
    return {"keywords": extract_keywords(state["transcription_words"])}


def step_generate_questions(state: State) -> State:
    return {"questions": generate_questions(state["transcription_words"])}


def step_analyze_speech_volume(state: State) -> State:
    high_volume_words, low_volume_words, volumes, volumes_timestamps = (
        analyze_speech_volume(state["audio_path"], state["transcription_words"])
    )

    events = []
    for word in high_volume_words:
        events.append(
            Event(
                start_s=word.start,
                end_s=word.end,
                event="Wysoki poziom głośności",
                description="Głośność jest wyższa niż przewidywana dla danego materiału, co może być niekomfortowe do słuchania.",
                color="#FF5722",
            )
        )
    for word in low_volume_words:
        events.append(
            Event(
                start_s=word.start,
                end_s=word.end,
                event="Niski poziom głośności",
                description="Głośność jest niższa niż przewidywana dla danego materiału, co może być niezrozumiała dla słuchacza.",
                color="#2196F3",
            )
        )

    events = combine_overlapping_events(events)
    events = filter_out_short_events(events, 2.0)

    return {
        "events": events,
        "volumes": volumes,
        "volumes_timestamps": volumes_timestamps,
    }


def step_generate_suggestions(state: State) -> State:
    return {
        "suggestions": generate_suggestions(
            state["transcription_words"], state["events"]
        )
    }


def step_extract_named_entities(state: State) -> State:
    return {"named_entities": extract_named_entities(state["transcription_words"])}


def step_add_formatted_transcription(state: State) -> State:
    return {
        "formatted_transcription": format_transcription(state["transcription_words"])
    }


def step_extract_target_group(state: State) -> State:
    return {"target_group": extract_target_group(state["transcription_words"])}


def step_classify_sentiment(state: State) -> State:
    return {"sentiment": classify_sentiment(state["transcription_words"])}


def step_calculate_speech_speed(state: State) -> State:
    MIN_WPM = 65
    MAX_WPM = 170
    description = "WPM (Words Per Minute) to wskaźnik mierzący tempo czytania lub pisania. W przypadku tekstów informacyjno-edukacyjnych zaleca się utrzymanie tempa 100-150 WPM, co pozwala na zrozumienie treści bez utraty uwagi."

    (
        avg_words_per_minute,
        words_per_minute,
        wpm_timestamps,
        pauses,
        pauses_timestamps,
    ) = speech_speed(state["transcription_words"])

    events = []
    if len(words_per_minute) > 0:
        # Always skip first wpm period because it's intro and can be slower
        for wpm, timestamp in zip(words_per_minute[1:], wpm_timestamps[1:]):
            if wpm < MIN_WPM:
                events.append(
                    Event(
                        start_s=timestamp[0],
                        end_s=timestamp[1],
                        event="Niska szybkość mówienia",
                        description=f"(WPM: {int(wpm)})\n" + description,
                        color="#3F51B5",
                    )
                )
            elif wpm > MAX_WPM:
                events.append(
                    Event(
                        start_s=timestamp[0],
                        end_s=timestamp[1],
                        event="Wysoka szybkość mówienia",
                        description=f"(WPM: {int(wpm)})\n" + description,
                        color="#F44336",
                    )
                )

    for pause, timestamp in zip(pauses, pauses_timestamps):
        print(pause)
        if pause < 0.1:
            events.append(
                Event(
                    start_s=timestamp[0],
                    end_s=timestamp[1],
                    event="Wysoka szybkość mówienia",
                    description=f"(WPM: {int(wpm)})\n" + description,
                    color="#F44336",
                )
            )

    events = combine_overlapping_events(events)
    events = filter_out_short_events(events, 2.0)

    return {
        "avg_words_per_minute": avg_words_per_minute,
        "words_per_minute": words_per_minute,
        "words_per_minute_timestamps": wpm_timestamps,
        "events": events,
    }


def step_add_clarity_score(state: State) -> State:
    HARD_FOG_THRESHOLD = 15

    fog_index = gunning_fog(state["readable_transcription"])

    if fog_index > HARD_FOG_THRESHOLD:
        min_word_timestamp = 999999
        max_word_timestamp = -1

        for word in state["transcription_words"]:
            if word.start < min_word_timestamp:
                min_word_timestamp = word.start
            if word.end > max_word_timestamp:
                max_word_timestamp = word.end

        events = [
            Event(
                start_s=min_word_timestamp,
                end_s=max_word_timestamp,
                event="Mglista wypowiedź (Wysoki Fog Index)",
                description="Indeks Foga (Gunning Fog Index) mierzy czytelność tekstu, określając poziom wykształcenia potrzebny do jego zrozumienia. Typowe wartości: 7-8 bardzo prosty tekst łatwy dla 13-latków, 9-12 średni poziom przeciętny dorosły, 13-16 trudny tekst np. artykuły naukowe, powyżej 17 bardzo trudny wyższe wykształcenie.",
                color="#607D8B",
            )
        ]
    else:
        events = []

    events = combine_overlapping_events(events)

    total_events = len(state["events"]) + len(events)

    return {
        "clarity_score": clarity_score(state["readable_transcription"], total_events),
        "events": combine_overlapping_events(events),
        "fog_index": int(fog_index),
    }


def build_graph():
    graph_builder = StateGraph(State)

    graph_builder.add_node(
        "step_extract_audio", step_extract_audio, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_transcribe_audio", step_transcribe_audio, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_extract_frames", step_extract_frames, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_classify_image", step_classify_image, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_gather_images", step_gather_images, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_detect_audio_problems",
        step_detect_audio_problems,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_add_formatted_transcription",
        step_add_formatted_transcription,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_convert_transcript_to_text",
        step_convert_transcript_to_text,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node("step_calculate_speech_speed", step_calculate_speech_speed)
    graph_builder.add_node("step_extract_keywords", step_extract_keywords)
    graph_builder.add_node(
        "step_extract_target_group",
        step_extract_target_group,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_translate_to_english",
        step_translate_to_english,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_extract_named_entities",
        step_extract_named_entities,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_generate_suggestions",
        step_generate_suggestions,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_classify_sentiment", step_classify_sentiment, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_analyze_speech_volume",
        step_analyze_speech_volume,
        retry=DEFAULT_RETRY_POLICY,
    )
    graph_builder.add_node(
        "step_add_clarity_score", step_add_clarity_score, retry=DEFAULT_RETRY_POLICY
    )
    graph_builder.add_node(
        "step_generate_questions", step_generate_questions, retry=DEFAULT_RETRY_POLICY
    )

    graph_builder.add_edge(START, "step_extract_audio")
    graph_builder.add_edge("step_extract_audio", "step_transcribe_audio")
    graph_builder.add_edge("step_transcribe_audio", "step_detect_audio_problems")
    graph_builder.add_edge("step_detect_audio_problems", "step_generate_suggestions")

    graph_builder.add_edge(START, "step_extract_frames")
    graph_builder.add_conditional_edges(
        "step_extract_frames", route_classify_image, ["step_classify_image"]
    )
    graph_builder.add_edge("step_classify_image", "step_gather_images")
    graph_builder.add_edge("step_gather_images", "step_generate_suggestions")

    graph_builder.add_edge("step_transcribe_audio", "step_analyze_speech_volume")
    graph_builder.add_edge("step_analyze_speech_volume", "step_generate_suggestions")

    graph_builder.add_edge("step_transcribe_audio", "step_convert_transcript_to_text")
    graph_builder.add_edge("step_convert_transcript_to_text", "step_add_clarity_score")
    graph_builder.add_edge("step_add_clarity_score", "step_generate_suggestions")

    graph_builder.add_edge("step_transcribe_audio", "step_classify_sentiment")
    graph_builder.add_edge("step_classify_sentiment", END)

    graph_builder.add_edge("step_transcribe_audio", "step_add_formatted_transcription")
    graph_builder.add_edge("step_add_formatted_transcription", END)

    graph_builder.add_edge("step_transcribe_audio", "step_calculate_speech_speed")
    graph_builder.add_edge("step_calculate_speech_speed", "step_generate_suggestions")

    graph_builder.add_edge("step_transcribe_audio", "step_extract_named_entities")
    graph_builder.add_edge("step_extract_named_entities", END)

    graph_builder.add_edge("step_transcribe_audio", "step_extract_keywords")
    graph_builder.add_edge("step_extract_keywords", END)

    graph_builder.add_edge("step_transcribe_audio", "step_extract_target_group")
    graph_builder.add_edge("step_extract_target_group", END)

    graph_builder.add_edge("step_transcribe_audio", "step_generate_questions")
    graph_builder.add_edge("step_generate_questions", END)

    graph_builder.add_edge(
        "step_convert_transcript_to_text", "step_translate_to_english"
    )
    graph_builder.add_edge("step_translate_to_english", END)

    graph_builder.add_edge("step_generate_suggestions", END)

    graph = graph_builder.compile()

    return graph
