import React, { useState, useRef, useEffect } from 'react';
import GaugeChart from 'react-gauge-chart';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import VideoPlayerWithTimeline from './components/VideoPlayerWithTimeline';
import { VideoProvider, useVideoState } from './VideoContext';
import { AppProvider, useAppState } from './AppContext';
import { CurrentVideoProvider, useCurrentVideoState } from './CurrentVideoContext';
import Header from './components/Header';
import Footer from './components/Footer';
import './App.css';
import { get_inference_by_id } from './utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  return (
    <AppProvider>
      <VideoProvider>
        <CurrentVideoProvider>
          <AppContent />
        </CurrentVideoProvider>
      </VideoProvider>
    </AppProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('score');
  const { uploadedVideo, score, errors, transcription = [], wpm_data, keywords, targetAudience, sentiment, namedEntities } = useVideoState();

  const { inferences } = useAppState();
  const { currentVideoId } = useCurrentVideoState();

  const current_inference = get_inference_by_id(currentVideoId, inferences);
  const volumes = current_inference?.volumes || [];
  const volumes_timestamps = current_inference?.volumes_timestamps || [];
  // Add this new line to get the questions from the current inference
  const questions = current_inference?.questions || [];
  const readable_transcription = current_inference?.readable_transcription || [];
  const english_translation = current_inference?.english_translation || [];
  const suggestions = current_inference?.suggestions || [];
  
  const [isLoading, setIsLoading] = useState(false);
  const [expandedError, setExpandedError] = useState(null);
  const videoRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loadingIntervalRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 99) {
            clearInterval(loadingIntervalRef.current);
            return 99;
          }
          return prev + (100 / (60 * 10)); // Update 10 times per second for 40 seconds
        });
      }, 100); // Run every 100ms
    } else {
      clearInterval(loadingIntervalRef.current);
      setLoadingProgress(0);
    }

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading]);

  const tabs = [
    { id: 'score', label: 'Jakość' },
    { id: 'analytics', label: 'Analityka' },
    { id: 'comments', label: 'Pytania' },
    { id: 'transcription', label: 'Transkrypcja' },
    { id: 'content', label: 'Zawartość' },
  ];

  // Mock data for the charts
  const loudnessData = {
    labels: volumes_timestamps.map((timestamp, i) => Math.round(parseFloat(timestamp))),
    datasets: [
      {
        label: 'Głośność',
        data: volumes,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Linia 45dB',
        data: Array(volumes.length).fill(45),
        borderColor: 'rgba(75, 192, 192, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Linia 75 WPM',
        data: Array(volumes.length).fill(75),
        borderColor: 'rgba(255, 159, 64, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      }
    ]
  };

  console.log(current_inference);

  const wpmData = {
    labels: current_inference.wpm_timestamps.map((timestamp, i) => (Math.round(timestamp[0] + timestamp[1]) / 2)),
    datasets: [
      {
        label: 'Szybkość mówienia (WPM)',
        data: wpm_data,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Linia 100 WPM',
        data: Array(wpm_data.length).fill(100),
        borderColor: 'rgba(75, 192, 192, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Linia 150 WPM',
        data: Array(wpm_data.length).fill(150),
        borderColor: 'rgba(255, 159, 64, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Changed to true to show the legend
        // position: 'top',
      },
      title: {
        display: false,
        text: 'Analiza mowy w czasie',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Czas (s)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Wartość'
        },
        suggestedMin: 0,
        suggestedMax: 200, // Increased to accommodate the 150 WPM line
      }
    }
  };

  const toggleErrorExpansion = (errorName) => {
    if (expandedError === errorName) {
      setExpandedError(null);
    } else {
      setExpandedError(errorName);
    }
  };

  const setVideoTime = (startTime) => {
    if (videoRef.current) {
      videoRef.current.seekTo(startTime);
    }
  };

  const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const sentiments = {
    positive: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Pozytywny',
      description: 'Wypowiedź ma ogólnie pozytywny wydźwięk, wyrażając entuzjazm i optymizm wobec omawianych technologii.'
    },
    negative: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Negatywny',
      description: 'Wypowiedź ma ogólnie negatywny wydźwięk, wyrażając krytykę lub sceptycyzm wobec omawianych technologii.'
    },
    neutral: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h.01M16 9h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Neutralny',
      description: 'Wypowiedź ma neutralny wydźwięk, przedstawiając fakty bez wyraźnego nacechowania emocjonalnego.'
    }
  };

  // For this example, let's assume the sentiment is positive

  const currentSentiment = sentiments[sentiment] || sentiments.neutral;

  // New variables for content analysis
  const transcriptionContent = (
    <p className="mb-2">{readable_transcription}</p>
  );

  const englishTranslation = (
    <p>{english_translation}</p>
  );

  const colors = [
    'blue',
    'green',
    'yellow',
    'red'
  ]

  const improvementSuggestions = suggestions.map((suggestion, index) => ({
    id: index+1,
    color: colors[index % colors.length],
    text: suggestion
  }))

  // const improvementSuggestions = [
  //   {
  //     id: 1,
  //     color: 'blue',
  //     text: 'Improve clarity in the introduction by providing a concise overview of the main topics.'
  //   },
  //   {
  //     id: 2,
  //     color: 'green',
  //     text: 'Add more specific examples to support your main points and enhance understanding.'
  //   },
  //   {
  //     id: 3,
  //     color: 'yellow',
  //     text: 'Consider using simpler language in technical sections to improve accessibility for a broader audience.'
  //   },
  //   {
  //     id: 4,
  //     color: 'red',
  //     text: 'Strengthen the conclusion with a clear call-to-action and summary of key takeaways.'
  //   }
  // ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {Header()}

      {isLoading && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div 
            className="bg-blue-600 dark:bg-blue-400 h-1 transition-all duration-100 ease-linear"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
      )}

      <div className="max-w-[90em] xl:min-w-[90em] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Existing video and sidebar content */}
          <main className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden relative min-h-[500px]">
            <VideoPlayerWithTimeline setIsLoading={setIsLoading} ref={videoRef} />
          </main>
          <aside className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden relative min-h-[500px]">
            {isLoading ? (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 bg-opacity-75 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
            ) : null}
            {uploadedVideo ? (
              <>
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`flex-1 py-4 text-center text-sm font-medium transition-all duration-200 ease-in-out ${activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {activeTab === 'score' && (
                    <div className="space-y-6">
                      <div className="pb-6 border-b border-gray-200 dark:border-gray-700 ">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Jakość Wypowiedzi</h2>
                      </div>
                      <div className='h-[500px] overflow-y-auto'>
                        <div className="w-64 mx-auto">
                          <GaugeChart
                            id="speech-score-gauge"
                            nrOfLevels={3}
                            percent={score / 100}
                            textColor="#374151"
                            needleColor="#2563EB"
                            needleBaseColor="#2563EB"
                            colors={["#FCA5A5", "#FCD34D", "#34D399"]}
                            cornerRadius={6}
                            arcWidth={0.3}
                            arcPadding={0.02}
                            animate={false}
                          />
                        </div>
                        
                        {/* New Fog Index section without shadow */}
                        <div className="mt-8 p-6 bg-white dark:bg-gray-700 rounded-lg pb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Indeks mglistości (Fog Index)</h3>
                          <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{current_inference.fog_index}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Interpretacja:</span> {fog_interpretation(current_inference.fog_index)}
                            </div>
                          </div>
                          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                            <div className={"h-full rounded-full " + fog_index_color(current_inference.fog_index)} style={{ width: fog_index_percentage(current_inference.fog_index) + "%" }}></div>
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-200 mt-2">
                          Potencjalne Problemy
                        </h3>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">

                          <div className="divide-y divide-gray-200">
                            {errors.map((error, index) => (
                              <div key={index} className="overflow-hidden">
                                <div
                                  className="flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                                  onClick={() => toggleErrorExpansion(error.name)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: error.color }}
                                    />
                                    <span className="text-gray-700 font-medium">{error.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-500 font-medium">
                                      {error.count} {error.count === 1 ? 'wystąpienie' : 'wystąpienia'}
                                    </span>
                                    <svg
                                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedError === error.name ? 'transform rotate-180' : ''
                                        }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                <div
                                  className={`px-6 py-4 bg-gray-50 text-sm text-gray-600 transition-all duration-200 ease-in-out ${expandedError === error.name ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                  style={{
                                    overflow: 'hidden',
                                    transitionProperty: 'max-height, opacity, padding',
                                    ...(expandedError === error.name ? {} : { "padding": 0 }),
                                  }}
                                >
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {error.timestamps.map((timestamp, eventIndex) => (
                                      <button
                                        key={eventIndex}
                                        onClick={() => setVideoTime(timestamp)}
                                        className={`px-2 py-1 text-white rounded-full text-xs font-medium transition-colors duration-150`}
                                        style={{
                                          backgroundColor: error.color,
                                          ':hover': {
                                            backgroundColor: `color-mix(in srgb, ${error.color} 80%, black)`,
                                          },
                                        }}
                                      >
                                        {formatTimestamp(timestamp)}
                                      </button>
                                    ))}
                                  </div>
                                  <p className="mb-2">{error.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Analityka</h2>
                      <div className="h-[500px] overflow-y-auto">
                        <div className="space-y-8">
                          <div className="w-full">
                            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Głośność</h3>
                            <Line data={loudnessData} options={chartOptions} />
                          </div>
                          <div className="w-full">
                            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Szybkość mówienia (WPM)</h3>
                            <Line data={wpmData} options={chartOptions} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'comments' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Pytania</h2>
                      <div className="h-[500px] overflow-y-auto">
                        <ul className="space-y-4 mb-6">
                          {questions.map((question, index) => (
                            <li key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                              <p className="text-gray-600 dark:text-gray-300">{question}</p>
                            </li>
                          ))}
                          {questions.length === 0 && (
                            <li className="text-gray-500 dark:text-gray-400">Brak pytań dla tego wideo.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  {activeTab === 'transcription' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Zawartość</h2>
                      <div className="h-[500px] overflow-y-auto">
                        {(transcription || []).map((item, index) => (
                          <div
                            key={index}
                            className="flex mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
                            onClick={() => setVideoTime(item.sentence_start)}
                          >
                            <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                              {formatTimestamp(item.sentence_start)}
                            </span>
                            <p className="text-gray-800 dark:text-gray-200">{item.sentence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === 'content' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Zawartość</h2>
                      <div className="h-[500px] overflow-y-auto space-y-6">
                        <div>
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Słowa kluczowe</h3>
                          <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Docelowa grupa</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            {targetAudience}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Wykryte podmioty</h3>
                          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                            {namedEntities.map((entity, index) => (
                              <li key={index}>{entity}</li>
                            ))}
                          </ul>
                          {namedEntities.length === 0 && <p className="text-gray-600 dark:text-gray-300">Nie wykryto podmiotów.</p>}
                        </div>

                        <div>
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Dominujący sentyment</h3>
                          <div className="flex items-center">
                            <span className="mr-2">
                              {currentSentiment.icon}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">{currentSentiment.label}</span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {currentSentiment.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center h-full text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold">Analysis will appear here</p>
                <p className="text-sm">Upload a video to see the analysis</p>
              </div>
            )}
          </aside>
        </div>

        {/* Improved wide paper section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Analiza Treści</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Transkrypcja
              </h3>
              <div className="h-[400px] overflow-y-auto text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {transcriptionContent}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
                </svg>
                Zawartość (en)
              </h3>
              <div className="h-[400px] overflow-y-auto text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {englishTranslation}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Sugestie poprawy
              </h3>
              <ul className="list-none h-[400px] overflow-y-auto text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
                {improvementSuggestions.map((suggestion) => (
                  <li key={suggestion.id} className="flex items-start">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-${suggestion.color}-100 dark:bg-${suggestion.color}-800 flex items-center justify-center mr-3 mt-1`}>
                      <span className={`text-${suggestion.color}-600 dark:text-${suggestion.color}-300 font-semibold text-sm`}>{suggestion.id}</span>
                    </span>
                    <p>{suggestion.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {Footer()}
    </div>
  );
}

function fog_interpretation(fog_index) {
  if (fog_index <= 6) {
    return "Bardzo prosty";
  } else if (fog_index <= 9) {
    return "Prosty";
  } else if (fog_index <= 12) {
    return "Dość prosty";
  } else if (fog_index < 15) {
    return "Dość trudny";
  } else if (fog_index <= 17) {
    return "Trudny";
  } else {
    return "Bardzo trudny";
  }
}

function fog_index_color(fog_index) {
  if (fog_index <= 6) {
    return "bg-green-500";
  } else if (fog_index <= 9) {
    return "bg-yellow-500";
  } else if (fog_index <= 12) {
    return "bg-orange-500";
  } else if (fog_index <= 15) {
    return "bg-red-500";
  } else {
    return "bg-red-500";
  }
}

function fog_index_percentage(fog_index) {
  return (fog_index / 18) * 100;
}

export default App;