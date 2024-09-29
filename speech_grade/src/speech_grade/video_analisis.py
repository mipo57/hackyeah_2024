import cv2
import os
import base64
import requests
from typing import List, Dict

def extract_frames(video_path, output_folder, interval=2):
    """
    Extract frames from a video file at specified intervals and save them to a folder.
    
    :param video_path: Path to the input video file
    :param output_folder: Path to the folder where frames will be saved
    :param interval: Interval in seconds between frame extractions (default is 2)
    """
    # Open the video file
    video = cv2.VideoCapture(video_path)
    
    # Get video properties
    fps = video.get(cv2.CAP_PROP_FPS)
    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
    
    # Calculate frame interval
    frame_interval = int(fps * interval)
    
    frame_count = 0
    saved_count = 0
    
    while True:
        # Read a frame
        success, frame = video.read()
        
        if not success:
            break
        
        # Save frame at specified intervals
        if frame_count % frame_interval == 0:
            frame_filename = os.path.join(output_folder, f"frame_{saved_count:04d}.jpg")
            cv2.imwrite(frame_filename, frame)
            saved_count += 1
        
        frame_count += 1
        
        # Optional: Print progress
        if frame_count % 100 == 0:
            print(f"Processed {frame_count}/{total_frames} frames")
    
    # Release the video capture object
    video.release()
    
    print(f"Extracted {saved_count} frames to {output_folder}")


import os
from openai import OpenAI
from typing import List, Dict
import concurrent.futures

def classify_images_in_folder(folder_path: str) -> List[Dict[str, str]]:
    """
    Classify images in a folder into one of three classes using OpenAI's API, running in parallel.
    
    :param folder_path: Path to the folder containing images
    :return: List of dictionaries containing image names and their classifications
    """
    # Define the three classes
    classes = [
        "1 -> Background, another person in the frame.",
        "2 -> Posture - Turning away, movements, argresive gesticulation.",
        "3 -> Facial expressions - wierd or agresive factial expresions."
        "4 -> No Person on the video"
    ]
    
    # Initialize OpenAI client
    client = OpenAI()
    
    # Get list of image files
    image_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
    def classify_image(filename):
        image_path = os.path.join(folder_path, filename)
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"Your task is to check whether there is one or more problems with the video of an official speaking. Here is a list of potential problems:\n{', '.join(classes)}\nReturn JSON list of problems you found by id (eg. [1,2]). If there are no problems, return empty list ([])."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{encode_image(image_path)}",
                                    "detail": "high"
                                },
                            },
                        ],
                    }
                ],
                max_tokens=50,
            )
            classification = response.choices[0].message.content.strip()
            return {"image": filename, "classification": classification}
        except Exception as e:
            return {"image": filename, "classification": f"Classification failed: {str(e)}"}

    # Use ThreadPoolExecutor to run classifications in parallel
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(classify_image, image_files))
    
    return results

def encode_image(image_path):
    """Encode the image to base64."""
    import base64
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')