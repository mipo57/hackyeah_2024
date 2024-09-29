import numpy as np
from pydub import AudioSegment
from openai.types.audio import TranscriptionWord
from typing import List, Tuple

def analyze_speech_volume(audio_path: str, words: List[TranscriptionWord], high_threshold_db=70, low_threshold_db=45) -> Tuple[List[TranscriptionWord], List[TranscriptionWord]]:
    """
    Analyze speech volume in an audio file and identify words with too high or too low volume.

    :param audio_path: Path to the audio file
    :param words: List of TranscriptionWord objects from the transcript
    :param high_threshold_db: Threshold for high volume in dB (default: 75)
    :param low_threshold_db: Threshold for low volume in dB (default: 45)
    :param segment_duration_ms: Duration of each segment to analyze in milliseconds (default: 500)
    :return: Tuple of two lists containing TranscriptionWord objects with high and low volume
    """
    # Load the audio file
    audio = AudioSegment.from_file(audio_path)

    # Initialize lists to store words with high and low volume
    high_volume_words = []
    low_volume_words = []

    volumes = []
    volumes_timestamps = []

    for word in words:
        word_start_ms = word.start * 1000
        word_end_ms = word.end * 1000

        segment = audio[word_start_ms:word_end_ms]

        rms = segment.rms
        # Convert RMS to dB
        if rms > 0:
            db = 20 * np.log10(rms)
        else:
            db = -float('inf')

        if db > high_threshold_db:
            high_volume_words.append(word)
        elif db < low_threshold_db:
            low_volume_words.append(word)

        volumes.append(db)
        volumes_timestamps.append((word_start_ms / 1000, word_end_ms / 1000))

    return high_volume_words, low_volume_words, volumes, volumes_timestamps

# Example usage:
# high_volume_words, low_volume_words = analyze_speech_volume("path/to/your/audio/file.mp3", transcript_words)
# print("Words with high volume:", [word.word for word in high_volume_words])
# print("Words with low volume:", [word.word for word in low_volume_words])
