// pages/index.tsx
import { useState, useEffect, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';
import ReportCard, { ReportCardDisplayData } from '@/components/ReportCard';
import { Report as PrismaReport } from '@prisma/client';
import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,     // Added for PWA display
  UserCircleIcon,   // Added for logged-in average icon
  WindowIcon        // Added for session average icon
} from '@heroicons/react/24/solid';

type ApiErrorResponse = {
  message: string;
  errorDetails?: string;
  errors?: Array<{ message: string }>;
};

type Strategy = 'mobile' | 'desktop';

// This interface was named AnalysisState in your code, which is fine.
// I'll use it as is.
interface AnalysisState { 
  report?: ReportCardDisplayData | null;
  error?: string | null;
  isLoading: boolean;
  // strategy?: Strategy | null; // Not strictly needed here if report contains strategy
}

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [url, setUrl] = useState<string>('');
  
  const [mobileAnalysis, setMobileAnalysis] = useState<AnalysisState>({ isLoading: false });
  const [desktopAnalysis, setDesktopAnalysis] = useState<AnalysisState>({ isLoading: false });
  const [activeTab, setActiveTab] = useState<Strategy>('mobile');

  const [formError, setFormError] = useState<string | null>(null);
  
  // Renamed pastReports to dbPastReports for clarity
  const [dbPastReports, setDbPastReports] = useState<PrismaReport[]>([]); 
  // New state for DB-backed average PWA score
  const [dbAveragePwaScore, setDbAveragePwaScore] = useState<number | null>(null);

  // --- NEW: State for reports generated in the current browser session (anonymous or logged-in) ---
  const [sessionReports, setSessionReports] = useState<ReportCardDisplayData[]>([]);
  // --- NEW: State for session-based average PWA score ---
  const [sessionAveragePwaScore, setSessionAveragePwaScore] = useState<number | null>(null);


  // Renamed fetchPastReports to fetchDbPastReports
  const fetchDbPastReports = async () => {
    if (session) {
      try {
        const res = await axios.get<PrismaReport[]>('/api/reports');
        setDbPastReports(res.data); // Update dbPastReports
      } catch (err) {
        console.error('Failed to fetch DB past reports:', err);
      }
    } else {
      setDbPastReports([]); // Clear if no session
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchDbPastReports();
      // Clear session-specific reports when user logs in to avoid mixing averages.
      // This means the "session average" will be based on reports generated *after* login for a logged-in user.
      setSessionReports([]); 
      setSessionAveragePwaScore(null);
    } else if (sessionStatus === 'unauthenticated') {
      setDbPastReports([]);
      setDbAveragePwaScore(null);
      // Anonymous user's session reports persist until browser refresh/close or they log in.
    }
  }, [sessionStatus, session]);




  // --- NEW: useEffect to calculate average PWA score from sessionReports (for current session, all users) ---
  useEffect(() => {
    if (sessionReports.length > 0) {
      const pwaScores = sessionReports
        .map(report => report.pwaScore)
        .filter(score => score !== null && typeof score === 'number') as number[];

      if (pwaScores.length > 0) {
        const sum = pwaScores.reduce((acc, score) => acc + score, 0);
        setSessionAveragePwaScore(Math.round(sum / pwaScores.length));
      } else {
        setSessionAveragePwaScore(null);
      }
    } else {
      setSessionAveragePwaScore(null); // Reset if no session reports
    }
  }, [sessionReports]);


  const analyzeStrategy = async (strategyToAnalyze: Strategy, currentUrl: string) => {
    const updateState = strategyToAnalyze === 'mobile' ? setMobileAnalysis : setDesktopAnalysis;
    updateState({ isLoading: true, report: null, error: null });

    try {
      const response = await axios.post<ReportCardDisplayData>('/api/analyze', { url: currentUrl, strategy: strategyToAnalyze });
      const newReport = response.data;
      updateState({ report: newReport, isLoading: false, error: null });
      
      // --- NEW: Add report to sessionReports for this session's average ---
      setSessionReports(prevReports => [...prevReports, newReport]);

      if (session) { // Refresh DB past reports if logged in
        fetchDbPastReports();
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const errorDetails = axiosError.response?.data?.errorDetails || axiosError.response?.data?.message || axiosError.message || `${strategyToAnalyze.charAt(0).toUpperCase() + strategyToAnalyze.slice(1)} analysis failed.`;
      console.error(`Error analyzing ${strategyToAnalyze} for ${currentUrl} (CLIENT SIDE):`, axiosError.response?.data || axiosError.message);
      updateState({ isLoading: false, error: errorDetails, report: null });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentUrl = url.trim();
    if (!currentUrl) {
      setFormError('Please enter a URL.');
      return;
    }
    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      setFormError('URL must start with http:// or https://');
      return;
    }

    setFormError(null);
    setMobileAnalysis({ isLoading: false, report: null, error: null }); 
    setDesktopAnalysis({ isLoading: false, report: null, error: null });
    setActiveTab('mobile');

    await analyzeStrategy('mobile', currentUrl);
    await analyzeStrategy('desktop', currentUrl);
  };

  const isLoading = mobileAnalysis.isLoading || desktopAnalysis.isLoading;
  const displayedAnalysis: AnalysisState | undefined = activeTab === 'mobile' ? mobileAnalysis : desktopAnalysis;
  const currentDisplayStrategy = displayedAnalysis?.report?.strategy || activeTab; // Used for loading message

  // --- NEW: Logic to determine which PWA average to show ---
  const pwaAverageToShow = session ? dbAveragePwaScore : sessionAveragePwaScore;
  const pwaAverageSourceText = session ? 
    (dbPastReports.filter(r => r.pwaScore !== null).length > 0 ? `Based on your last ${dbPastReports.filter(r => r.pwaScore !== null).length} PWA-evaluated reports.` : "No PWA data in your history.") :
    (sessionReports.filter(r => r.pwaScore !== null).length > 0 ? `Based on ${sessionReports.filter(r => r.pwaScore !== null).length} PWA-evaluated reports in this session.` : "No PWA data in this session yet.");
  
  const showPwaAverageSection = pwaAverageToShow !== null && !isLoading && 
                                (session ? dbPastReports.length > 0 : sessionReports.length > 0);


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          PageSpeed Diagnostics
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Analyze your web page performance.
        </p>
      </header>

      <section className="bg-white p-6 sm:p-8 shadow-2xl rounded-xl">
        <form onSubmit={handleSubmit} className="flex items-center space-x-4">
          <div className="flex-grow">
            <label htmlFor="url" className="sr-only">Website URL</label>
            <input
              type="url" id="url" value={url}
              onChange={(e) => { setUrl(e.target.value); setFormError(null); }}
              placeholder="Enter a web page URL (e.g., https://example.com)"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>
          <button
            type="submit" disabled={isLoading || sessionStatus === 'loading'}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors group whitespace-nowrap"
          >
            {isLoading ? (<><ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />Analyzing...</>) : ('Analyze')}
          </button>
        </form>
        {formError && (<p className="mt-4 text-red-600">{formError}</p>)}
      </section>

      {/* --- NEW: Section for Average PWA Score --- */}
      {showPwaAverageSection && (
        <section className="mt-10 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {session ? <UserCircleIcon className="h-8 w-8 mr-3 opacity-80" /> : <WindowIcon className="h-8 w-8 mr-3 opacity-80" />}
              <div>
                <h3 className="text-xl font-semibold">Average PWA Score</h3>
                <p className="text-sm opacity-80">{pwaAverageSourceText}</p>
              </div>
            </div>
            <div className={`text-4xl font-bold p-2 px-4 rounded-lg ${
                pwaAverageToShow! >= 90 ? 'bg-green-400 bg-opacity-30' : 
                pwaAverageToShow! >= 50 ? 'bg-yellow-400 bg-opacity-30' : 
                'bg-red-400 bg-opacity-30'
            }`}>
              {pwaAverageToShow}
            </div>
          </div>
        </section>
      )}
      {/* --- End Section for Average PWA Score --- */}


      {/* Tabs and Results Section */}
      {(mobileAnalysis.isLoading || desktopAnalysis.isLoading || mobileAnalysis.report || desktopAnalysis.report || mobileAnalysis.error || desktopAnalysis.error) && (
        <section className="mt-10">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 justify-center" aria-label="Tabs">
              {(['mobile', 'desktop'] as Strategy[]).map((tabStrategy) => (
                <button
                  key={tabStrategy} onClick={() => setActiveTab(tabStrategy)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tabStrategy ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {tabStrategy === 'mobile' ? <DevicePhoneMobileIcon className={`mr-2 h-5 w-5 ${activeTab === tabStrategy ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`} /> : <ComputerDesktopIcon className={`mr-2 h-5 w-5 ${activeTab === tabStrategy ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`} />}
                  {tabStrategy.charAt(0).toUpperCase() + tabStrategy.slice(1)}
                  {(tabStrategy === 'mobile' && mobileAnalysis.isLoading) || (tabStrategy === 'desktop' && desktopAnalysis.isLoading) ? (<ArrowPathIcon className="animate-spin h-4 w-4 ml-2 text-indigo-500" />) : null}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8">
            {displayedAnalysis?.isLoading && (
              <div className="text-center p-10 text-slate-500">
                <ArrowPathIcon className="animate-spin h-8 w-8 mx-auto mb-4 text-indigo-500" />
                Loading {currentDisplayStrategy.charAt(0).toUpperCase() + currentDisplayStrategy.slice(1)} Report...
              </div>
            )}
            {displayedAnalysis?.error && !displayedAnalysis.isLoading && (
              <div className="p-6 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md shadow-md">
                <h3 className="font-semibold text-lg mb-1">
                  {(displayedAnalysis.report?.strategy || activeTab).charAt(0).toUpperCase() + (displayedAnalysis.report?.strategy || activeTab).slice(1)} Analysis Failed
                </h3>
                <p className="text-sm whitespace-pre-wrap">{displayedAnalysis.error}</p>
              </div>
            )}
            {displayedAnalysis?.report && !displayedAnalysis.isLoading && (
              <ReportCard report={displayedAnalysis.report} isCurrent />
            )}
             {!displayedAnalysis?.isLoading && !displayedAnalysis?.error && !displayedAnalysis?.report && (mobileAnalysis.report || desktopAnalysis.report || mobileAnalysis.error || desktopAnalysis.error) && (
                 <div className="text-center p-10 text-slate-400">
                    Select a tab to view its report or error.
                 </div>
            )}
          </div>
        </section>
      )}

      {/* Past Reports Section (for logged-in users) */}
      {session && dbPastReports.length > 0 && (
         <section className="mt-12">
         <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Your Past Reports</h2>
         <div className="space-y-8">
         {dbPastReports.map((report) => (
           <ReportCard key={report.id} report={report as unknown as ReportCardDisplayData} />
         ))}
         </div>
       </section>
      )}
      
      {/* Conditional messages at the bottom */}
       {session && dbPastReports.length === 0 && sessionStatus === 'authenticated' && !isLoading && !mobileAnalysis.report && !desktopAnalysis.report && (
         <section className="text-center text-slate-500 p-6 bg-slate-50 rounded-lg mt-8">
            You have no saved analysis history. Perform an analysis to build your history.
         </section>
       )}
       {/* This message for anonymous users when no session reports exist yet */}
       {!session && sessionReports.length === 0 && !isLoading && !mobileAnalysis.report && !desktopAnalysis.report && (
         <section className="text-center text-slate-500 p-6 bg-slate-50 rounded-lg mt-8">
            Perform an analysis to see reports and session average scores.
         </section>
       )}
       
    </div>
  );
}