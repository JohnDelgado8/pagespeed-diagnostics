// pages/security-checker.tsx
import React, { useState, FormEvent } from 'react'; // Ensure React is imported for JSX
import axios, { AxiosError } from 'axios';
import { NextPage } from 'next';
import Head from 'next/head';
// Link is not needed here if navigation is handled by the global Navbar in Layout
import { 
    ArrowPathIcon, 
    ShieldCheckIcon, 
    ExclamationTriangleIcon, 
    InformationCircleIcon,
    // CheckCircleIcon,
    XCircleIcon, // Make sure this is imported
    DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/solid';
// REMOVE: import Layout from '@/components/Layout'; // REMOVED THIS IMPORT

// --- TYPE DEFINITIONS ---
interface SecurityCheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn' | 'info' | 'clean' | 'infected' | 'not_blacklisted' | 'blacklisted';
  message: string;
  details?: string | string[];
}

interface SecurityCheckItem { 
  // Added 'check' as optional because summary items might only use 'text'
  // Made 'text' and 'message' optional as one or the other might be used.
  check?: string; 
  text?: string;  
  status: 'pass' | 'fail' | 'warn' | 'info' | 'clean' | 'infected' | 'not_blacklisted' | 'blacklisted';
  message?: string; 
  details?: string | string[];
}

interface SiteInfo {
  ipAddress?: string;
  hosting?: string;
  cms?: string;
  server?: string;
}

// This is the structure your API at /api/security-scan should return
interface ApiSecurityScanResponse {
  url: string;
  scanDate: string;
  overallStatusText?: string;
  overallStatusSeverity?: 'good' | 'warning' | 'danger' | 'info';
  results: SecurityCheckResult[]; 
  malwareSummary?: SecurityCheckItem; 
  blacklistSummary?: SecurityCheckItem;
  siteInfo?: SiteInfo;
  securityRisk?: 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';
  overallScanMessage?: string;
  malwareAndSecurityDetails?: SecurityCheckItem[]; // For the "Website Malware & Security" card
  blacklistStatusDetails?: SecurityCheckItem[];  // For the "Website Blacklist Status" card
}

type ApiErrorResponse = {
  message: string;
  errorDetails?: string;
};

// Explicit return type for getStatusIconAndColor
interface StatusDisplayInfo {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}
// --- END TYPE DEFINITIONS ---

const SecurityCheckerPage: NextPage = () => {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanReport, setScanReport] = useState<ApiSecurityScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentUrl = url.trim();
    if (!currentUrl) {
      setError('Please enter a website URL to scan.');
      return;
    }
    let fullUrl = currentUrl;
    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      fullUrl = `https://${currentUrl}`;
    }
    setUrl(fullUrl);

    setIsLoading(true);
    setError(null);
    setScanReport(null);

    try {
      const response = await axios.post<ApiSecurityScanResponse>('/api/security-scan', { url: fullUrl });
      setScanReport(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const errorMsg = axiosError.response?.data?.errorDetails || axiosError.response?.data?.message || axiosError.message || 'Failed to perform security scan.';
      setError(errorMsg);
      console.error('Security scan error:', axiosError);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusIconAndColor = (status?: SecurityCheckResult['status'] | ApiSecurityScanResponse['overallStatusSeverity']): StatusDisplayInfo => {
    switch (status) {
      case 'pass':
      case 'good':
      case 'clean':
      case 'not_blacklisted':
        return { Icon: ShieldCheckIcon, color: "text-green-500", bgColor: "bg-green-50", borderColor: "border-green-200" };
      case 'fail':
      case 'danger':
      case 'infected':
      case 'blacklisted':
        return { Icon: XCircleIcon, color: "text-red-500", bgColor: "bg-red-50", borderColor: "border-red-200" };
      case 'warn':
      case 'warning':
        return { Icon: ExclamationTriangleIcon, color: "text-yellow-500", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" };
      case 'info':
      default:
        return { Icon: InformationCircleIcon, color: "text-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-200" };
    }
  };
  
  const getDetailItemIcon = (status: SecurityCheckResult['status']) => {
    const { Icon, color } = getStatusIconAndColor(status);
    return <Icon className={`h-5 w-5 ${color} mr-3 flex-shrink-0`} />;
  };

  const getRiskMeterStyles = (risk?: ApiSecurityScanResponse['securityRisk']) => {
    if (!risk) return { width: '0%', color: 'bg-gray-300' };
    const riskLevels = ['Minimal', 'Low', 'Medium', 'High', 'Critical'];
    const riskIndex = riskLevels.indexOf(risk);
    const percentage = riskIndex >= 0 ? ((riskIndex + 0.5) / riskLevels.length) * 100 : 5;
    let color = 'bg-green-500'; 
    if (risk === 'Low') color = 'bg-yellow-400';
    else if (risk === 'Medium') color = 'bg-yellow-500';
    else if (risk === 'High') color = 'bg-orange-500';
    else if (risk === 'Critical') color = 'bg-red-600';
    return { width: `${Math.min(100, Math.max(0,percentage))}%`, color };
  };

  return (
    <> {/* Page content starts here, Layout is applied in _app.tsx */}
      <Head>
        <title>Website Security Checker - Analyzer Tools</title>
        <meta name="description" content="Free website malware and security checker. Scan your site for known vulnerabilities and threats." />
      </Head>
      
      {/* This div is now the top-level content wrapper for this specific page's content.
          It will be placed inside the <main> tag of your global Layout.
          The classes should match your pages/index.tsx for consistent width and spacing.
      */}
      <div className="py-8 space-y-10"> {/* Assuming Layout's <main> has p-4, this makes total py-12 */}
          
        {/* Page Header Section */}
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-auto sm:h-16 text-teal-600" />
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900">
            Free Website Security Checker
          </h1>
          <p className="mt-3 text-md text-gray-600 max-w-2xl mx-auto">
            Enter a URL like example.com. Our scanner will perform basic checks for known malware, viruses, blacklisting, website errors, and malicious code.
          </p>
        </div>

        {/* Input Form Section */}
        {(!scanReport || error || (scanReport && !isLoading)) && !isLoading && (
          <section className={`bg-white p-6 sm:p-8 shadow-xl rounded-lg ${scanReport && !error ? 'max-w-full' : 'max-w-2xl mx-auto'}`}>
            <form onSubmit={handleSubmit} className="flex items-center space-x-3 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
              <input
                type="text" id="security-url" value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); if (scanReport) setScanReport(null); }}
                placeholder="example.com" required
                className="flex-grow appearance-none block w-full px-4 py-3 border-0 rounded-l-md placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm text-black"
              />
              <button
                type="submit" disabled={isLoading}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent rounded-r-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-teal-500 disabled:bg-gray-300 disabled:cursor-not-allowed group whitespace-nowrap h-full"
              >
                {isLoading ? <ArrowPathIcon className="animate-spin h-5 w-5" /> : 'Submit'}
              </button>
            </form>
            {error && !isLoading && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>
            )}
            {(!scanReport || error) && (
                 <p className="mt-6 text-xs text-gray-500 text-center">
                    Disclaimer: This is a free website security scanner. Remote scanners have limited access and results are not guaranteed. For a full website scan at the client and server levels, consider professional services.
                 </p>
            )}
          </section>
        )}

        {isLoading && (
            <div className="text-center p-10 text-slate-600">
              <ArrowPathIcon className="animate-spin h-10 w-10 mx-auto mb-4 text-teal-500" />
              <p className="text-xl font-medium">Scanning website for security threats...</p>
              <p className="text-sm text-slate-500">This may take a moment.</p>
          </div>
        )}

        {/* Scan Report Display Section */}
        {scanReport && !isLoading && !error && (
          <div className="space-y-8">
            {/* Top Summary Section */}
            <section className="bg-white p-6 shadow-lg rounded-lg">
              {/* Overall Status */}
              {scanReport.overallStatusText && scanReport.overallStatusSeverity && (
                  <div className={`p-4 rounded-md border mb-6 ${getStatusIconAndColor(scanReport.overallStatusSeverity).borderColor} ${getStatusIconAndColor(scanReport.overallStatusSeverity).bgColor}`}>
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {React.createElement(getStatusIconAndColor(scanReport.overallStatusSeverity).Icon, {
                                className: `h-6 w-6 ${getStatusIconAndColor(scanReport.overallStatusSeverity).color}`,
                                "aria-hidden": "true" 
                            })}
                        </div>
                        <div className="ml-3">
                            <h3 className={`text-lg font-medium ${getStatusIconAndColor(scanReport.overallStatusSeverity).color}`}>
                                {scanReport.overallStatusText}
                            </h3>
                        </div>
                    </div>
                  </div>
              )}
              
              {/* Malware & Blacklist Summaries */}
              {scanReport.malwareSummary && scanReport.blacklistSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                  <div className="flex items-center">
                    {React.createElement(getStatusIconAndColor(scanReport.malwareSummary.status).Icon, {className: `h-8 w-8 ${getStatusIconAndColor(scanReport.malwareSummary.status).color} mr-3 flex-shrink-0`})}
                    <div>
                      <h3 className="font-semibold text-slate-800">{scanReport.malwareSummary.text}</h3>
                      <p className="text-sm text-slate-600">{scanReport.malwareSummary.details || "Scanner status for malware."}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                     {React.createElement(getStatusIconAndColor(scanReport.blacklistSummary.status).Icon, {className: `h-8 w-8 ${getStatusIconAndColor(scanReport.blacklistSummary.status).color} mr-3 flex-shrink-0`})}
                    <div>
                      <h3 className="font-semibold text-slate-800">{scanReport.blacklistSummary.text}</h3>
                      <p className="text-sm text-slate-600">{scanReport.blacklistSummary.details || "Status on checked blacklists."}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {scanReport.siteInfo && (
                <div className="border rounded-md p-4 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 mb-6">
                  <div className="flex items-center text-slate-700 flex-shrink-0">
                    <DocumentMagnifyingGlassIcon className="h-10 w-10 mr-3 text-slate-400"/>
                    <span className="font-medium break-all">{scanReport.url}</span>
                  </div>
                  <div className="md:pl-6 md:border-l border-gray-200 text-sm text-slate-600 space-y-1 flex-grow">
                    {scanReport.siteInfo.ipAddress && <p><strong>IP address:</strong> {scanReport.siteInfo.ipAddress}</p>}
                    {scanReport.siteInfo.hosting && <p><strong>Hosting:</strong> {scanReport.siteInfo.hosting}</p>}
                    {scanReport.siteInfo.server && <p><strong>Running on:</strong> {scanReport.siteInfo.server}</p>}
                    {scanReport.siteInfo.cms && <p><strong>CMS:</strong> {scanReport.siteInfo.cms}</p>}
                  </div>
                </div>
              )}

              {scanReport.securityRisk && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-3.5 relative overflow-hidden">
                    <div 
                      className={`h-3.5 rounded-full absolute top-0 left-0 ${getRiskMeterStyles(scanReport.securityRisk).color}`}
                      style={{ width: getRiskMeterStyles(scanReport.securityRisk).width }}
                    ></div>
                    <div 
                        className="absolute top-full transform -translate-y-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-600"
                        style={{ left: getRiskMeterStyles(scanReport.securityRisk).width }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                    <span>Minimal</span>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                    <span>Critical</span>
                  </div>
                </div>
              )}
              {scanReport.overallScanMessage && (
                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-md border">
                    {scanReport.overallScanMessage}
                </p>
              )}
            </section>

            {/* Detailed Cards Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {scanReport.malwareAndSecurityDetails && scanReport.malwareAndSecurityDetails.length > 0 && (
                  <section className="bg-white p-6 shadow-lg rounded-lg">
                      <h3 className="text-xl font-semibold text-slate-800 mb-4">Website Malware & Security</h3>
                      <div className="space-y-3">
                      {scanReport.malwareAndSecurityDetails.map((item: SecurityCheckItem, index: number) => (
                          <div key={index} className="flex items-center text-sm py-1 border-b border-slate-100 last:border-b-0 text-black">
                              {getDetailItemIcon(item.status)}
                              <span className="flex-grow">{item.text}</span>
                              {item.details && <span className="text-slate-500 ml-2 text-xs">({item.details})</span>}
                          </div>
                      ))}
                      </div>
                  </section>
              )}
              {scanReport.blacklistStatusDetails && scanReport.blacklistStatusDetails.length > 0 && (
                  <section className="bg-white p-6 shadow-lg rounded-lg">
                      <h3 className="text-xl font-semibold text-slate-800 mb-4">Website Blacklist Status</h3>
                      <div className="space-y-3">
                      {scanReport.blacklistStatusDetails.map((item: SecurityCheckItem, index: number) => (
                          <div key={index} className="flex items-center text-sm py-1 border-b border-slate-100 last:border-b-0 text-black">
                              {getDetailItemIcon(item.status)}
                              <span className="flex-grow">{item.text}</span>
                              {item.details && <span className="text-slate-500 ml-2 text-xs">({item.details})</span>}
                          </div>
                      ))}
                      </div>
                  </section>
              )}
            </div>
              <button 
                onClick={() => { setScanReport(null); setUrl(''); setError(null);}}
                className="mt-8 w-full sm:w-auto mx-auto flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Scan Another Site
              </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SecurityCheckerPage;