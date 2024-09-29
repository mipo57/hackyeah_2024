from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import time
from speech_grade.pipeline.graph import build_graph
from tempfile import TemporaryDirectory
from dotenv import load_dotenv
import os

load_dotenv()

graph = build_graph()
app = FastAPI()

# Configure CORS to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/analyze_video", response_model=Dict)
async def analyze_video(video: UploadFile = File(...)):
    video_name = video.filename or "unnamed_video"
    with TemporaryDirectory() as temp_dir:
        # Write the uploaded video to a temporary file
        video_path = f"{temp_dir}/video.mp4"
        with open(video_path, "wb") as buffer:
            buffer.write(video.file.read())

        res = graph.invoke({
            "temp_dir": temp_dir,
            "video_path": video_path,
            "events": []
        })

    return {
        "video_name": video_name,
        "score": res["clarity_score"],
        "detected_events": res["events"],
        "transcription": res["formatted_transcription"],
        "wpm_data": res["words_per_minute"],
        "wpm_timestamps": res["words_per_minute_timestamps"],
        "keywords": res["keywords"],
        "target_audience": res["target_group"],
        "sentiment": res["sentiment"],
        "named_entities": res["named_entities"],
        "creation_date": time.strftime("%Y-%m-%d")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("SPEECH_GRADE_PORT", "8000")))
