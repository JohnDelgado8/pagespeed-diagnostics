// components/MetricsDisplay.tsx
import React from 'react';

interface MetricItemProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  displayValue?: string; // Lighthouse often provides this
  score?: number | null; // Score for this metric (0-1)
}

const MetricItem: React.FC<MetricItemProps> = ({ title, value, unit, displayValue, score }) => {
  if (value == null && displayValue == null) return null;

  let dotColor = 'bg-gray-400'; // Neutral
  if (score != null) {
    if (score >= 0.9) dotColor = 'bg-green-500'; // Good
    else if (score >= 0.5) dotColor = 'bg-yellow-500'; // Okay
    else dotColor = 'bg-red-500'; // Poor
  }

  const display = displayValue || `${value}${unit || ''}`;

  return (
    <div className="py-3">
      <div className="flex items-center text-sm text-slate-700">
        <span className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${dotColor}`}></span>
        {title}
      </div>
      <div className="text-xl font-semibold text-slate-800 mt-1">
        {display}
      </div>
    </div>
  );
};


interface MetricsDisplayProps {
  audits: any; // The lhr.audits object
  timing?: any; // lhr.timing
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ audits }) => {
  if (!audits) return null;

  // Key metrics to display (Lighthouse audit IDs)
  const metricIds = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
    'speed-index',
    // 'interactive', // from lhr.timing.interactive
  ];

  const metricsToShow = metricIds.map(id => audits[id]).filter(Boolean);
  // const interactiveTime = timing?.interactive;

  return (
    <div className="my-8">
      <h3 className="text-lg font-semibold text-slate-700 mb-1">METRICS</h3>
      <hr className="mb-4"/>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
        {metricsToShow.map((metric: any) => (
          <MetricItem
            key={metric.id}
            title={metric.title}
            displayValue={metric.displayValue}
            score={metric.score} // Pass the audit score for color coding
          />
        ))}
        {/* {interactiveTime && (
           <MetricItem title="Time to Interactive" displayValue={`${(interactiveTime / 1000).toFixed(1)} s`} />
        )} */}
      </div>
    </div>
  );
};

export default MetricsDisplay;