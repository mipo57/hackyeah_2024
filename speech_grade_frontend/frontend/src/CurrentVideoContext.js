import React, { createContext, useContext, useReducer } from 'react';

const CurrentVideoStateContext = createContext();
const CurrentVideoDispatchContext = createContext();

const initialState = {
  currentVideo: null,
  currentVideoId: null,
};

function currentVideoReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'SET_CURRENT_VIDEO_ID':
      return { ...state, currentVideoId: action.payload };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function CurrentVideoProvider({ children }) {
  const [state, dispatch] = useReducer(currentVideoReducer, initialState);

  return (
    <CurrentVideoStateContext.Provider value={state}>
      <CurrentVideoDispatchContext.Provider value={dispatch}>
        {children}
      </CurrentVideoDispatchContext.Provider>
    </CurrentVideoStateContext.Provider>
  );
}

export function useCurrentVideoState() {
  const context = useContext(CurrentVideoStateContext);
  if (context === undefined) {
    throw new Error('useCurrentVideoState must be used within a CurrentVideoProvider');
  }
  return context;
}

export function useCurrentVideoDispatch() {
  const context = useContext(CurrentVideoDispatchContext);
  if (context === undefined) {
    throw new Error('useCurrentVideoDispatch must be used within a CurrentVideoProvider');
  }
  return context;
}