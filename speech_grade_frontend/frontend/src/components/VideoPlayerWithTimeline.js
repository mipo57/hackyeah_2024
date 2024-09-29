import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import ReactPlayer from 'react-player';
import { useVideoState, useVideoDispatch } from '../VideoContext';
import { useAppState, useAppDispatch } from '../AppContext';
import { useCurrentVideoState, useCurrentVideoDispatch } from '../CurrentVideoContext';
import axios from 'axios';
import { generateVideoMD5, has_inference, get_inference_by_id } from '../utils';

const VideoPlayerWithTimeline = forwardRef(({ setIsLoading: setParentIsLoading }, ref) => {
  const { uploadedVideo, events, serverAddress } = useVideoState();
  const dispatch = useVideoDispatch();

  const { currentVideo, currentVideoId } = useCurrentVideoState();
  const { inferences } = useAppState();
  const appStateDispatch = useAppDispatch();
  const currentVideoDispatch = useCurrentVideoDispatch();


  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const playerRef = useRef(null);
  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleDuration = (duration) => {
    setDuration(duration);
  };

  const togglePlay = useCallback(() => {
    setPlaying(prevPlaying => !prevPlaying);
  }, []);

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleTimelineClick = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    playerRef.current.seekTo(clickPosition);
  };

  const handleEventHover = useCallback((event) => {
    setHoveredEvent(event);
  }, []);

  const handleEventLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    console.log(file);
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_VIDEO', payload: videoUrl });

      const videoId = await generateVideoMD5(file);

      currentVideoDispatch({ type: 'SET_CURRENT_VIDEO', payload: videoUrl });
      currentVideoDispatch({ type: 'SET_CURRENT_VIDEO_ID', payload: videoId });
      
      setIsLoading(true);
      setParentIsLoading(true);

      const formData = new FormData();
      formData.append('video', file);

      try {

        let response_data;

        if (has_inference(videoId, inferences)) {
          response_data = get_inference_by_id(videoId, inferences);
        } else {
          const response = await axios.post(`${serverAddress}/analyze_video`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          response_data = response.data;
          appStateDispatch({ type: "ADD_INFERENCE", payload: {id: videoId, data: response.data} });
        }

        const { score, detected_events, transcription, wpm_data, keywords, target_audience, sentiment, named_entities } = response_data;

        const analyzedEvents = detected_events.map(event => ({
          start: event.start_s,
          end: event.end_s,
          color: event.color,
          description: event.event,
          details: event.description
        }));

        const eventCounts = {};
        const eventTimestamps = {};
        const eventDescriptions = {}
        const eventColors = {}

        analyzedEvents.forEach(event => {
          if (eventCounts[event.description]) {
            eventCounts[event.description]++;
            eventTimestamps[event.description].push(event.start);
          } else {
            eventCounts[event.description] = 1;
            eventDescriptions[event.description] = event.details;
            eventTimestamps[event.description] = [event.start];
          }
          eventColors[event.description] = event.color;
        });

        const errors = Object.entries(eventCounts).map(([name, count]) => ({
          name,
          count,
          description: eventDescriptions[name],
          timestamps: eventTimestamps[name],
          color: eventColors[name]
        }));

        dispatch({ type: 'SET_EVENTS', payload: analyzedEvents });
        dispatch({ type: 'SET_SCORE', payload: score });
        dispatch({ type: 'SET_ERRORS', payload: errors });
        dispatch({ type: 'SET_TRANSCRIPTION', payload: transcription });
        dispatch({ type: 'SET_WPM_DATA', payload: wpm_data });
        dispatch({ type: 'SET_KEYWORDS', payload: keywords });
        dispatch({ type: 'SET_TARGET_AUDIENCE', payload: target_audience });
        dispatch({ type: 'SET_SENTIMENT', payload: sentiment });
        dispatch({ type: 'SET_NAMED_ENTITIES', payload: named_entities });
      } catch (error) {
        console.error('Error analyzing video:', error);
        alert('An error occurred while analyzing the video. Please try again.');
      } finally {
        setIsLoading(false);
        setParentIsLoading(false);
      }
    } else {
      alert('Please upload a valid video file.');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_VIDEO', payload: videoUrl });
      // Simulate receiving events after a short delay (as above)
    } else {
      alert('Please drop a valid video file.');
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const organizeEvents = useCallback(() => {
    if (!events.length) return [];

    const eventsByDescription = {};

    events.forEach(event => {
      if (!eventsByDescription[event.description]) {
        eventsByDescription[event.description] = [];
      }
      eventsByDescription[event.description].push(event);
    });

    const rows = Object.values(eventsByDescription).map(events => 
      events.sort((a, b) => a.start - b.start)
    );

    return rows;
  }, [events]);

  const eventRows = organizeEvents();

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [togglePlay]);

  const handleProgress = useCallback((state) => {
    setProgress(state.played);
  }, []);

  const seekTo = useCallback((time) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    }
  }, []);

  // Expose the seekTo method via the ref
  React.useImperativeHandle(ref, () => ({
    seekTo
  }));

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
      )}
      {!uploadedVideo ? (
        <div 
          className="relative pt-[56.25%] bg-gray-800 flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-semibold">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-400">MP4, WebM, or Ogg files accepted</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="video/*" 
            onChange={handleFileUpload} 
          />
        </div>
      ) : (
        <div className="relative pt-[56.25%]">
          <ReactPlayer
            ref={playerRef}
            url={uploadedVideo}
            playing={playing}
            volume={volume}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onDuration={handleDuration}
            onProgress={handleProgress}
            progressInterval={100}
          />
        </div>
      )}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors duration-200"
          >
            {playing ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 accent-blue-500"
            />
          </div>
        </div>
        {uploadedVideo && (
          <div 
            ref={timelineRef}
            className="relative bg-gray-700 rounded-lg mt-2"
            style={{ height: `${eventRows.length * 26 + 8}px` }}
            onClick={handleTimelineClick}
          >
            {eventRows.map((row, rowIndex) => (
              <div key={rowIndex} className="absolute w-full h-6" style={{ top: `${rowIndex * 26}px` }}>
                {row.map((event, index) => (
                  <div
                    key={index}
                    className="absolute h-full cursor-pointer z-10 rounded-md transition-opacity duration-200 hover:opacity-80"
                    style={{
                      left: `${(event.start / duration) * 100}%`,
                      width: `${((event.end - event.start) / duration) * 100}%`,
                      backgroundColor: event.color,
                    }}
                    onMouseEnter={() => handleEventHover(event)}
                    onMouseLeave={handleEventLeave}
                  />
                ))}
              </div>
            ))}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white z-30"
              style={{ left: `${progress * 100}%`, transition: 'left 0.1s linear' }}
            />
            {hoveredEvent && (
              <div
                className="absolute bottom-full mb-2 p-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg transform transition-all duration-200 ease-out z-100"
                style={{
                  left: `${((hoveredEvent.start + (hoveredEvent.end - hoveredEvent.start) / 2) / duration) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="relative z-10">
                  {hoveredEvent.description}
                </div>
                <div className="absolute left-1/2 bottom-0 w-3 h-3 bg-white transform rotate-45 translate-y-1/2 -translate-x-1/2 z-0"></div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(progress * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayerWithTimeline;