from openai.types.audio import TranscriptionWord
from typing import List, Tuple
from more_itertools import windowed



def speech_speed(
    transcription_words: List[TranscriptionWord],
) -> Tuple[float, List[float]]:
    CHUNK_SIZE = 7

    words_per_minute = []
    wpm_timestamps = []

    for words_chunk in windowed(transcription_words, CHUNK_SIZE, step=1):
        duration = words_chunk[-1].end - words_chunk[0].start

        middle_chunk = words_chunk[len(words_chunk) // 2]

        if duration == 0:
            continue

        words_per_minute.append(len(words_chunk) / duration * 60)
        wpm_timestamps.append((middle_chunk.start, middle_chunk.end))

    avg_words_per_minute = (
        len(transcription_words)
        / (transcription_words[-1].end - transcription_words[0].start)
        * 60
    )

    pauses = []
    pauses_timestamps = []
    last_word_end = transcription_words[0].end
    for word in transcription_words[1:]:
        pauses.append(word.start - last_word_end)
        last_word_end = word.end
        pauses_timestamps.append((last_word_end, word.end))

    return (
        avg_words_per_minute,
        words_per_minute,
        wpm_timestamps,
        pauses,
        pauses_timestamps,
    )
