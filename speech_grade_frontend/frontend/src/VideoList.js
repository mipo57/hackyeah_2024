import React, { useState, useMemo } from 'react';
import CountUp from 'react-countup';
import Header from './components/Header';
import Footer from './components/Footer';
import { AppProvider, useAppState } from './AppContext';

function VideoList() {
    return (
      <AppProvider>
        <VideoListContent />
      </AppProvider>
    );
}

function calculateProblems(events) {
    const problemCounts = {};
  
    events.forEach(event => {
      if (!problemCounts[event.event]) {
        problemCounts[event.event] = {
          name: event.event,
          count: 0,
          color: event.color
        };
      }
      problemCounts[event.event].count++;
    });
  
    return Object.values(problemCounts);
  }

const VideoListContent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const itemsPerPage = 20;

  const { inferences } = useAppState();

  console.log(inferences)

  const videos = inferences.map((inference) => ({
    id: inference.id,
    name: inference.data.video_name,
    score: Math.round(inference.data.score),
    dateUploaded: inference.data.creation_date,
    problems: calculateProblems(inference.data.detected_events)
  }));

  // Mock data for demonstration
//   const videos = Array.from({ length: 100 }, (_, i) => ({
//     id: i + 1,
//     name: `Video ${i + 1}`,
//     score: Math.floor(Math.random() * 100),
//     dateUploaded: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toLocaleDateString(),
//     problems: [
//       { name: 'Filler Words', count: Math.floor(Math.random() * 10) },
//       { name: 'Pace', count: Math.floor(Math.random() * 5) },
//       { name: 'Clarity', count: Math.floor(Math.random() * 3) },
//     ],
//   }));

  // Calculate statistics
  const statistics = useMemo(() => {
    const problemCounts = videos.reduce((acc, video) => {
      video.problems.forEach(problem => {
        acc[problem.name] = (acc[problem.name] || 0) + problem.count;
      });
      return acc;
    }, {});

    const scores = videos.map(video => video.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const bottomPercentile = sortedScores[Math.floor(scores.length * 0.1)];
    const topPercentile = sortedScores[Math.floor(scores.length * 0.9)];

    return {
      problemCounts,
      avgScore: Math.round(avgScore),
      bottomPercentile,
      topPercentile,
    };
  }, [videos]);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      if (sortField === 'dateUploaded') {
        return sortDirection === 'asc' 
          ? new Date(a.dateUploaded) - new Date(b.dateUploaded)
          : new Date(b.dateUploaded) - new Date(a.dateUploaded);
      } else if (sortField === 'problemsTotal') {
        const aTotal = a.problems.reduce((sum, problem) => sum + problem.count, 0);
        const bTotal = b.problems.reduce((sum, problem) => sum + problem.count, 0);
        return sortDirection === 'asc' ? aTotal - bTotal : bTotal - aTotal;
      }
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [videos, sortField, sortDirection]);

  const currentVideos = sortedVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* <h1 className="text-2xl font-semibold text-gray-900 mb-6">Video List</h1> */}
        
        {/* Statistics Section */}
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Statystyki wyników</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Średnia</p>
              <CountUp key="avg-score" end={statistics.avgScore} className="text-2xl font-bold text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dolne 10%</p>
              <CountUp key="bottom-percentile" end={statistics.bottomPercentile} className="text-2xl font-bold text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Górne 10%</p>
              <CountUp key="top-percentile" end={statistics.topPercentile} className="text-2xl font-bold text-green-600" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(statistics.problemCounts).map(([problem, count]) => (
            <div key={problem} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{problem}</h3>
              <CountUp key={`${problem}-count`} end={count} className="text-3xl font-bold text-indigo-600" />
            </div>
          ))}
        </div>

        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Nazwa {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('score')}
                >
                  Wynik {sortField === 'score' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('dateUploaded')}
                >
                  Data przesłania {sortField === 'dateUploaded' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('problemsTotal')}
                >
                  Problemy {sortField === 'problemsTotal' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentVideos.map((video) => (
                <tr key={video.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{video.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{video.score}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{video.dateUploaded}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-wrap gap-2">
                      {video.problems.map((problem, index) => (
                        <span key={index} className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {problem.name}: {problem.count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {Array.from({ length: Math.ceil(videos.length / itemsPerPage) }).map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === index + 1
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VideoList;