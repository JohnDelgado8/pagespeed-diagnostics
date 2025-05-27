// components/PerformanceGauge.tsx
import React from 'react';

interface PerformanceGaugeProps {
  score: number | null | undefined;
  label?: string;
}

const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({ score, label = "Performance" }) => {
  if (score == null) return null;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let ringColor = 'text-gray-300';
  let textColor = 'text-slate-700';

  if (score >= 90) {
    ringColor = 'text-green-500';
    textColor = 'text-green-600';
  } else if (score >= 50) {
    ringColor = 'text-yellow-500';
    textColor = 'text-yellow-600';
  } else {
    ringColor = 'text-red-500';
    textColor = 'text-red-600';
  }

  return (
    <div className="flex flex-col items-center my-8">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full" viewBox="0 0 160 160">
          <circle
            className="text-gray-200"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
          />
          <circle
            className={ringColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-5xl font-bold ${textColor}`}>
          {score}
        </div>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${textColor}`}>{label}</p>
      <p className="text-sm text-slate-500 mt-1">
        Values are estimated and may vary.
      </p>
      {/* Add legend if desired */}
    </div>
  );
};

export default PerformanceGauge;