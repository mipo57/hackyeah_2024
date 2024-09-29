import vertexai
from vertexai.generative_models import GenerativeModel, Part, SafetySetting
import google.generativeai as genai
from google.auth import default

# Use default credentials
credentials, _ = default()

# Configure the API with credentials
genai.configure(credentials=credentials)
vertexai.init(project="serious-mariner-427010-u3", location="us-central1")


def analyze_audio(audio_file_path: str):
    audio_data = open(audio_file_path, "rb").read()

    audio1 = Part.from_data(mime_type="audio/mpeg", data=audio_data)

    generation_config = {
        "max_output_tokens": 8192,
        "temperature": 1,
        "top_p": 0.95,
    }

    safety_settings = [
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
    ]

    model = GenerativeModel(
        "gemini-1.5-flash-002",
    )
    responses = model.generate_content(
        ["""Przenalizuj emocjie w audio, napisz kiedy są yyy eee itp""", audio1],
        generation_config=generation_config,
        safety_settings=safety_settings,
        stream=True,
    )

    return responses
