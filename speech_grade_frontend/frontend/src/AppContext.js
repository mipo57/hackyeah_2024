import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppStateContext = createContext();
const AppDispatchContext = createContext();

const initialState = {
  inferences: [],
  serverAddress: 'http://localhost:8000',
};

function getInitialState() {
  const savedState = localStorage.getItem('appState');
  return savedState ? JSON.parse(savedState) : initialState;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'ADD_INFERENCE':
      return { ...state, inferences: [...state.inferences, action.payload] };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, getInitialState());

  useEffect(() => {
    localStorage.setItem('appState', JSON.stringify(state));
  }, [state]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a AppProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within a AppProvider');
  }
  return context;
}