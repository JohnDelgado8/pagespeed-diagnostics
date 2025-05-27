// components/DiagnosticsDisplay.tsx
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon, ExclamationTriangleIcon, LightBulbIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // Added CheckCircleIcon

interface AuditItemProps { // Renamed from DiagnosticItemProps for clarity
  audit: any;
  isPassed?: boolean; // To style passed audits differently if needed
}

const AuditItem: React.FC<AuditItemProps> = ({ audit, isPassed }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine icon and color based on score and displayMode
  let Icon = InformationCircleIcon;
  let iconColor = "text-slate-500"; // Default for informative or N/A
  let titleColor = "text-slate-700";

  if (isPassed) {
    Icon = CheckCircleIcon;
    iconColor = "text-green-500";
    titleColor = "text-slate-600"; // Slightly dimmer for passed items
  } else if (audit.scoreDisplayMode === 'opportunity') {
    Icon = LightBulbIcon;
    iconColor = "text-yellow-600"; // Opportunities are often yellow/orange
  } else if (audit.score != null) {
    if (audit.score >= 0.9) { // This might be for 'binary' type that are not 'passed' but scored high
      Icon = CheckCircleIcon;
      iconColor = "text-green-500";
    } else if (audit.score >= 0.5) {
      Icon = ExclamationTriangleIcon; // Was LightBulbIcon, can be more severe
      iconColor = "text-yellow-500";
    } else { // score < 0.5
      Icon = ExclamationTriangleIcon;
      iconColor = "text-red-600";
    }
  } else if (audit.scoreDisplayMode === 'manual') {
    Icon = InformationCircleIcon; // Manual checks are informative
    iconColor = "text-blue-500";
  }


  // Don't render "notApplicable" or "error" audits in the main list unless explicitly handled
  if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'error') {
    // You could have a separate section for these if desired
    return null;
  }

  return (
    <div className="border-b border-gray-200 py-2 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-sm hover:bg-slate-50 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <div className="flex items-center min-w-0"> {/* min-w-0 for text truncation */}
          <Icon className={`h-5 w-5 mr-3 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
          <span className={`font-medium ${titleColor} truncate`}>{audit.title}</span>
          {/* DisplayValue is often savings for opportunities */}
          {audit.displayValue && !isPassed && <span className="ml-2 text-red-600 font-semibold whitespace-nowrap">{audit.displayValue}</span>}
        </div>
        {audit.description && (isOpen ? <ChevronUpIcon className="h-5 w-5 text-slate-400 flex-shrink-0" /> : <ChevronDownIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />)}
      </button>
      {isOpen && audit.description && (
        <div className="mt-2 mb-1 pl-10 pr-2 text-sm text-slate-600 prose prose-sm max-w-none">
          {/* Use dangerouslySetInnerHTML for markdown from Lighthouse. Ensure sanitization if content is from untrusted source */}
          <div dangerouslySetInnerHTML={{ __html: audit.description.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">$1</a>') }} />
          {/* TODO: Render tables from audit.details if present and type is 'table' */}
        </div>
      )}
    </div>
  );
};


interface CategorySectionProps {
  category: any; // Single category object from lhr.categories
  allAudits: any; // The entire lhr.audits object
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, allAudits }) => {
  const [showPassed, setShowPassed] = useState(false);
  const [showManual, setShowManual] = useState(false); // For "Additional items to manually check"

  if (!category || !category.auditRefs || category.id === 'pwa') { // Skip PWA or if no auditRefs
      // If you removed PWA, this check `category.id === 'pwa'` handles it.
      // Otherwise, if PWA category exists but has no score/is not applicable, this might also be relevant.
      return null; 
  }

  const relevantAudits = category.auditRefs
    .map((ref: any) => allAudits[ref.id])
    .filter((audit: any) => audit && audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'error');

  const opportunitiesAndDiagnostics = relevantAudits.filter((audit: any) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'manual');
  const manualChecks = relevantAudits.filter((audit: any) => audit.scoreDisplayMode === 'manual');
  const passedAudits = relevantAudits.filter((audit: any) => audit.score === 1 && audit.scoreDisplayMode !== 'manual' && audit.scoreDisplayMode !== 'informative');

  // If no actionable items or manual checks, and no passed items to show, don't render the section for this category
  if (opportunitiesAndDiagnostics.length === 0 && manualChecks.length === 0 && passedAudits.length === 0) {
    return null;
  }
  
  // Main score for the category itself (the large gauge at the top of the category section in PSI)
  const categoryScore = category.score != null ? Math.round(category.score * 100) : null;


  return (
    <div className="mb-10 p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex flex-col items-center mb-4 text-center">
        {categoryScore !== null && (
            <div className={`relative w-24 h-24 mb-2`}> {/* Larger score display for category */}
                <svg className="w-full h-full" viewBox="0 0 80 80">
                    <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="36" cx="40" cy="40" />
                    <circle
                        className={categoryScore >= 90 ? 'text-green-500' : categoryScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 36}
                        strokeDashoffset={(2 * Math.PI * 36) - (categoryScore / 100) * (2 * Math.PI * 36)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="36" cx="40" cy="40"
                        transform="rotate(-90 40 40)"
                    />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${categoryScore >= 90 ? 'text-green-600' : categoryScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {categoryScore}
                </div>
            </div>
        )}
        <h3 className="text-xl font-semibold text-slate-800">{category.title}</h3>
        {category.description && (
             <p className="text-sm text-slate-500 mt-1 max-w-xl mx-auto"
                dangerouslySetInnerHTML={{ __html: category.description.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">$1</a>') }} />
        )}
      </div>

      {opportunitiesAndDiagnostics.length > 0 && (
        <div className="mb-6">
          {/* <h4 className="text-md font-semibold text-slate-700 mb-2">Opportunities & Diagnostics</h4> */}
          {opportunitiesAndDiagnostics.map((audit: any) => (
            <AuditItem key={audit.id} audit={audit} />
          ))}
        </div>
      )}

      {manualChecks.length > 0 && (
        <div className="mb-6">
          <button 
            onClick={() => setShowManual(!showManual)}
            className="w-full flex justify-between items-center text-left py-2 px-1 text-md font-semibold text-slate-600 hover:text-slate-800"
          >
            ADDITIONAL ITEMS TO MANUALLY CHECK ({manualChecks.length})
            {showManual ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </button>
          {showManual && manualChecks.map((audit: any) => (
            <AuditItem key={audit.id} audit={audit} />
          ))}
        </div>
      )}

      {passedAudits.length > 0 && (
        <div>
          <button 
            onClick={() => setShowPassed(!showPassed)}
            className="w-full flex justify-between items-center text-left py-2 px-1 text-md font-semibold text-slate-600 hover:text-slate-800"
          >
            PASSED AUDITS ({passedAudits.length})
            {showPassed ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </button>
          {showPassed && passedAudits.map((audit: any) => (
            <AuditItem key={audit.id} audit={audit} isPassed />
          ))}
        </div>
      )}
    </div>
  );
};


interface DiagnosticsDisplayProps {
  categories: any; // The lhr.categories object
  audits: any;     // The lhr.audits object
}

const DiagnosticsDisplay: React.FC<DiagnosticsDisplayProps> = ({ categories, audits }) => {
  if (!categories || !audits) return <p className="text-slate-500">Diagnostic data not available.</p>;

  // Define the order and IDs of categories you want to display
  const categoryDisplayOrder = ['performance', 'accessibility', 'best-practices', 'seo'];

  return (
    <div className="my-8 space-y-8">
      <h2 className="text-2xl font-bold text-slate-800 text-center sr-only">Detailed Diagnostics</h2> 
      {/* sr-only because each category section will have its own title */}
      {categoryDisplayOrder.map(categoryId => {
        const category = categories[categoryId];
        if (category) { // Make sure category exists in the report
          return <CategorySection key={categoryId} category={category} allAudits={audits} />;
        }
        return null;
      })}
    </div>
  );
};

export default DiagnosticsDisplay;