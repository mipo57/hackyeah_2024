import cv2
import os
import base64
import requests
from typing import List, Dict

def extract_frames(video_path, output_folder, interval=2):
    """
    Extract frames from a video file at specified intervals, resize to 512x512, and save them to a folder.
    
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
    last_timestamp = 0
    
    while True:
        # Read a frame
        success, frame = video.read()
        
        if not success:
            break
        
        # Calculate current timestamp in milliseconds
        current_timestamp = int((frame_count / fps) * 1000)
        
        # Save frame at specified intervals
        if frame_count % frame_interval == 0:
            timestamp_start = last_timestamp
            timestamp_end = current_timestamp
            frame_filename = os.path.join(output_folder, f"{timestamp_start:04d}_{timestamp_end:04d}.jpg")
            
            # Resize the frame to 512x512
            resized_frame = cv2.resize(frame, (512, 512), interpolation=cv2.INTER_AREA)
            
            cv2.imwrite(frame_filename, resized_frame)
            saved_count += 1
            last_timestamp = current_timestamp
        
        frame_count += 1
        
        # Optional: Print progress
        if frame_count % 100 == 0:
            print(f"Processed {frame_count}/{total_frames} frames")
    
    # Release the video capture object
    video.release()
    
    print(f"Extracted {saved_count} frames to {output_folder}")