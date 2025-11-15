import React, { useState, useCallback } from 'react';
import { Screen } from './types';
import type { SessionData, SessionReport } from './types';
import IntroScreen from './components/IntroScreen';
import ManagementScreen from './components/ManagementScreen';
import SpeechRoom from './components/SpeechRoom';
import { generateSessionSummary } from './services/geminiService';


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Intro);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);

  const handleStartSession = useCallback((data: SessionData) => {
    setSessionData(data);
    setCurrentScreen(Screen.SpeechRoom);
  }, []);

  const handleEndSession = useCallback(async (report: SessionReport) => {
    setCurrentScreen(Screen.Management);
    setSessionData(null);

    // Add report immediately for a snappy UI, with a placeholder for the summary
    const reportWithPlaceholder: SessionReport = {
      ...report,
      summary: "Đang tạo đánh giá và phân tích..."
    };
    setReports(prev => [...prev, reportWithPlaceholder]);

    try {
      // Generate the summary in the background
      const summary = await generateSessionSummary(report);
      
      // Update the specific report in the list with the generated summary
      setReports(prev =>
        prev.map(r => (r.id === report.id ? { ...r, summary } : r))
      );
    } catch (error) {
       console.error("Failed to generate and update session summary", error);
       // Update the report with an error message if summary generation fails
        setReports(prev =>
          prev.map(r => (r.id === report.id ? { ...r, summary: "Lỗi: Không thể tạo đánh giá." } : r))
        );
    }
  }, []);

  const handleDeleteReport = useCallback((reportId: string) => {
    setReports(prevReports => prevReports.filter(report => report.id !== reportId));
  }, []);
  
  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Intro:
        return <IntroScreen onStart={() => setCurrentScreen(Screen.Management)} />;
      case Screen.Management:
        return <ManagementScreen onStartSession={handleStartSession} reports={reports} onDeleteReport={handleDeleteReport} />;
      case Screen.SpeechRoom:
        if (sessionData) {
          return <SpeechRoom sessionData={sessionData} onEndSession={handleEndSession} />;
        }
        // Fallback if sessionData is null
        setCurrentScreen(Screen.Management);
        return null;
      default:
        return <IntroScreen onStart={() => setCurrentScreen(Screen.Management)} />;
    }
  };

  return (
    <div className="w-full h-full">
      {renderScreen()}
    </div>
  );
};

export default App;