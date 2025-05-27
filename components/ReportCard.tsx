// components/ReportCard.tsx
import React from 'react';
import { ComputerDesktopIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'; // Or solid
import PerformanceGauge from './PerformanceGauge';
import MetricsDisplay from './MetricsDisplay';
import DiagnosticsDisplay from './DiagnosticsDisplay'; // Assuming this is the new version
import type { FullLighthouseDetails } from '@/pages/api/analyze'; // Import from where you defined it (API file or shared types)

// ReportCardDisplayData should match the structure your frontend receives and uses
export interface ReportCardDisplayData {
  id?: string;
  url: string;
  strategy: string;
  performanceScore?: number | null; 
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  seoScore?: number | null;
  pwaScore?: number | null; // Keep if you still want PWA at top-level, or remove
  fullLighthouseDetails?: FullLighthouseDetails | null; // This is key for detailed view
  createdAt?: Date | string;
}

interface ReportCardProps {
  report: ReportCardDisplayData;
  isCurrent?: boolean;
}

// CategoryScoreItem component (SVG version for arc border, from previous step)
const CategoryScoreItem: React.FC<{label: string, score: number | null | undefined}> = ({label, score}) => {
  const displayScore = score ?? '-';
  const numericScore = score ?? 0;
  const radius = 28;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const offset = score != null ? circumference - (numericScore / 100) * circumference : 0; 

  let arcColorClass = 'text-gray-400';
  let fillColorClass = 'bg-gray-100';
  let textColorClass = 'text-gray-700';

  if (score != null) {
    if (score >= 90) {
      arcColorClass = 'text-green-500'; fillColorClass = 'bg-green-50'; textColorClass = 'text-green-700';
    } else if (score >= 50) {
      arcColorClass = 'text-yellow-500'; fillColorClass = 'bg-yellow-50'; textColorClass = 'text-yellow-700';
    } else {
      arcColorClass = 'text-red-500'; fillColorClass = 'bg-red-50'; textColorClass = 'text-red-700';
    }
  } else {
    arcColorClass = 'text-gray-300'; fillColorClass = 'bg-gray-100'; textColorClass = 'text-gray-500';
  }

  return (
    <div className="flex flex-col items-center text-center p-1">
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 mb-1 rounded-full shadow-md ${fillColorClass}`}>
        <svg className="w-full h-full" viewBox="0 0 68 68">
          <circle
            className={arcColorClass} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" stroke="currentColor" fill="transparent"
            r={radius} cx="34" cy="34" transform="rotate(-90 34 34)"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-xl sm:text-2xl font-bold ${textColorClass}`}>
          {displayScore}
        </div>
      </div>
      <p className={`text-xs sm:text-sm font-medium ${textColorClass}`}>{label}</p>
    </div>
  );
};


const ReportCard: React.FC<ReportCardProps> = ({ report, isCurrent }) => {
  // Derive scores primarily from fullLighthouseDetails.categories if available
  // Fallback to top-level scores if fullLighthouseDetails is missing (e.g., for older reports)
  const lhrCategories = report.fullLighthouseDetails?.categories;
  const lhrAudits = report.fullLighthouseDetails?.audits;
  const lhrTiming = report.fullLighthouseDetails?.timing;
  const lhrFinalUrl = report.fullLighthouseDetails?.finalUrl;
  const lhrFetchTime = report.fullLighthouseDetails?.fetchTime;

  const performanceScore = report.performanceScore ?? (lhrCategories?.performance?.score != null ? Math.round(lhrCategories.performance.score * 100) : null);
  const accessibilityScore = report.accessibilityScore ?? (lhrCategories?.accessibility?.score != null ? Math.round(lhrCategories.accessibility.score * 100) : null);
  const bestPracticesScore = report.bestPracticesScore ?? (lhrCategories?.['best-practices']?.score != null ? Math.round(lhrCategories['best-practices'].score * 100) : null);
  const seoScore = report.seoScore ?? (lhrCategories?.seo?.score != null ? Math.round(lhrCategories.seo.score * 100) : null);
  // const pwaScore = report.pwaScore ?? (lhrCategories?.pwa?.score != null ? Math.round(lhrCategories.pwa.score * 100) : null); // If you keep PWA

  // Check if there's enough data to render a meaningful card
  if (!lhrFinalUrl && !report.url && performanceScore == null) {
    return (
      <div className="bg-white shadow-xl rounded-xl p-6 mb-8 text-center text-slate-500">
        Report data is incomplete or unavailable.
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-xl rounded-xl p-4 sm:p-6 mb-8 ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 break-all leading-tight">
            {lhrFinalUrl || report.url}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            {report.strategy.toLowerCase() === 'desktop' ? (
              <ComputerDesktopIcon className="h-5 w-5 mr-1 text-indigo-500" />
            ) : (
              <DevicePhoneMobileIcon className="h-5 w-5 mr-1 text-indigo-500" />
            )}
            Strategy: <span className="font-medium capitalize ml-1">{report.strategy}</span>
            {(lhrFetchTime || report.createdAt) && (
              <span className="ml-3 hidden sm:inline">
                Analyzed: {new Date(lhrFetchTime || report.createdAt!).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top Category Scores Summary */}
      <div className="grid grid-cols-2 mobile-lg:grid-cols-4 gap-1 sm:gap-2 mb-6 sm:mb-8">
        <CategoryScoreItem label="Performance" score={performanceScore} />
        <CategoryScoreItem label="Accessibility" score={accessibilityScore} />
        <CategoryScoreItem label="Best Practices" score={bestPracticesScore} />
        <CategoryScoreItem label="SEO" score={seoScore} />
        {/* {report.pwaScore !== undefined && <CategoryScoreItem label="PWA" score={report.pwaScore} />} */}
      </div>
      
      {/* Display detailed sections only if fullLighthouseDetails are present */}
      {report.fullLighthouseDetails && lhrAudits && lhrCategories && ( // Ensure audits and categories exist
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-1 flex justify-center">
              <PerformanceGauge score={performanceScore} />
            </div>
            <div className="md:col-span-2">
              {lhrAudits['final-screenshot']?.details?.data && (
                <div className="mb-6 border rounded-lg overflow-hidden shadow-md">
                  <img 
                    src={lhrAudits['final-screenshot'].details.data} 
                    alt="Final Screenshot" 
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
              )}
            </div>
          </div>
          <MetricsDisplay audits={lhrAudits} timing={lhrTiming} />
          
          {/* MODIFIED: Pass lhrCategories and lhrAudits to DiagnosticsDisplay */}
          <DiagnosticsDisplay categories={lhrCategories} audits={lhrAudits} /> 
        </>
      )}
      {/* Message if full details are missing but basic scores are present */}
      {!report.fullLighthouseDetails && (performanceScore != null) && (
        <p className="text-center text-slate-500 italic my-4">Detailed diagnostics not available for this report.</p>
      )}
    </div>
  );
};

export default ReportCard;