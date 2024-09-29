import React, { createContext, useContext, useReducer } from 'react';

const VideoStateContext = createContext();
const VideoDispatchContext = createContext();

const initialState = {
  uploadedVideo: null,
  events: [],
  score: 0,
  errors: [],
  transcription: [],
  wpm_data: [],
  keywords: [],
  targetAudience: [],
  sentiment: [],
  namedEntities: [],
  serverAddress: 'http://localhost:8000',
};

function videoReducer(state, action) {
  switch (action.type) {
    case 'SET_VIDEO':
      return { ...state, uploadedVideo: action.payload };
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'SET_SCORE':
      return { ...state, score: action.payload };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'SET_TRANSCRIPTION':
      return { ...state, transcription: action.payload };
    case 'SET_WPM_DATA':
      return { ...state, wpm_data: action.payload };
    case 'SET_KEYWORDS':
      return { ...state, keywords: action.payload };
    case 'SET_TARGET_AUDIENCE':
      return { ...state, targetAudience: action.payload };
    case 'SET_SENTIMENT':
      return { ...state, sentiment: action.payload };
    case 'SET_NAMED_ENTITIES':
      return { ...state, namedEntities: action.payload };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function VideoProvider({ children }) {
  const [state, dispatch] = useReducer(videoReducer, initialState);

  return (
    <VideoStateContext.Provider value={state}>
      <VideoDispatchContext.Provider value={dispatch}>
        {children}
      </VideoDispatchContext.Provider>
    </VideoStateContext.Provider>
  );
}

export function useVideoState() {
  const context = useContext(VideoStateContext);
  if (context === undefined) {
    throw new Error('useVideoState must be used within a VideoProvider');
  }
  return context;
}

export function useVideoDispatch() {
  const context = useContext(VideoDispatchContext);
  if (context === undefined) {
    throw new Error('useVideoDispatch must be used within a VideoProvider');
  }
  return context;
}