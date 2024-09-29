from moviepy.editor import VideoFileClip


def extract_audio_from_mp4(input_file, output_file):
    """
    Extract audio from an MP4 file and save it as an MP3 file.

    :param input_file: Path to the input MP4 file
    :param output_file: Path to save the output MP3 file
    """
    try:
        # Load the video file
        video = VideoFileClip(input_file)

        # Extract the audio
        audio = video.audio

        # Write the audio to an MP3 file
        audio.write_audiofile(output_file)

        # Close the video to release resources
        video.close()

        print(f"Audio extracted successfully and saved to {output_file}")
    except Exception as e:
        print(f"An error occurred: {str(e)}")


# Example usage
# extract_audio_from_mp4("input_video.mp4", "output_audio.mp3")
