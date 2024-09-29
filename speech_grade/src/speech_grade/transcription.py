from openai import OpenAI


def transcribe_audio(audio_file_path):
    """
    Transcribe an audio file using OpenAI's Whisper model via the API.

    :param audio_file_path: Path to the input audio file (MP3)
    :param api_key: Your OpenAI API key
    :return: The transcription text
    """
    try:
        client = OpenAI()

        audio_file = open(audio_file_path, "rb")

        transcript = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            language="pl",
            response_format="verbose_json",
            prompt="Wydaje mi się, że yyymmm że jest to dobry pomysł! [pauza] Chyba, że nie...",
            timestamp_granularities=["word"],
        )

        return transcript.words

    except Exception as e:
        print(f"An error occurred during transcription: {str(e)}")
        return None


# Example usage
# api_key = "your-api-key-here"
# transcription = transcribe_audio("path/to/your/audio.mp3", api_key)
# if transcription:
#     print(transcription)
