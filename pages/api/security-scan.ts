// pages/api/security-scan.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosResponseHeaders } from 'axios';
import { z } from 'zod';
import { URL } from 'url';

// --- TYPE DEFINITIONS ---
interface SecurityCheckItem {
  text?: string; 
  check?: string; 
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

interface ApiSecurityScanResponse {
  url: string;
  scanDate: string;
  overallStatusText?: string;
  overallStatusSeverity?: 'good' | 'warning' | 'danger' | 'info';
  results?: SecurityCheckItem[]; 
  malwareSummary?: SecurityCheckItem; 
  blacklistSummary?: SecurityCheckItem;
  siteInfo?: SiteInfo;
  securityRisk?: 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';
  overallScanMessage?: string;
  malwareAndSecurityDetails?: SecurityCheckItem[];
  blacklistStatusDetails?: SecurityCheckItem[];
}
// --- END TYPE DEFINITIONS ---

const scanSchema = z.object({
  url: z.string().url({ message: 'Invalid URL. Must include http:// or https://' }),
});

const createCheckItem = (
  identifier: string, 
  status: SecurityCheckItem['status'], 
  message?: string, 
  details?: string | string[],
  isSummaryItem: boolean = false 
): SecurityCheckItem => {
  if (isSummaryItem) {
    return { text: identifier, status, details: message };
  }
  return { check: identifier, text: identifier, status, message: message || '', details };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiSecurityScanResponse | { message: string, errorDetails?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url: requestedUrlInput } = req.body;
  let targetUrl: string;

  try {
    const validatedData = scanSchema.parse(req.body);
    targetUrl = validatedData.url;

    console.log(`[API /security-scan] Received scan request for: ${targetUrl}`);

    const malwareAndSecurityItems: SecurityCheckItem[] = [];
    const blacklistItems: SecurityCheckItem[] = [];
    const siteInformation: SiteInfo = {};
    
    // Initialize risk and overall status
    let calculatedRiskLevel: ApiSecurityScanResponse['securityRisk'] = 'Minimal';
    let calculatedOverallSeverity: ApiSecurityScanResponse['overallStatusSeverity'] = 'good';
    let calculatedOverallStatusText: string = 'Basic security checks passed.';
    let currentMalwareSummary: SecurityCheckItem = { text: "Malware Scan Initializing", status: 'info' };
    let currentBlacklistSummary: SecurityCheckItem = { text: "Blacklist Status Initializing", status: 'info' };
    let currentOverallScanMessage: string = "Scan is processing...";


    // 1. HTTPS Check
   try {
  const parsedUrl = new URL(targetUrl);
  if (parsedUrl.protocol === 'https:') {
    malwareAndSecurityItems.push(createCheckItem('HTTPS Usage', 'pass', 'Site is served over a secure HTTPS connection.'));
  } else {
    malwareAndSecurityItems.push(createCheckItem('HTTPS Usage', 'fail', 'Site is not using HTTPS! This is a critical security vulnerability.'));
  }
} catch {
  malwareAndSecurityItems.push(createCheckItem('URL Parsing', 'fail', 'The provided URL could not be parsed correctly.'));
}

    // 2. Basic Header Analysis
    try {
      const response = await axios.get(targetUrl, { 
        timeout: 10000, maxRedirects: 5, 
        headers: { 'User-Agent': 'Mozilla/5.0 (SecurityScanner/1.0)' } 
      });
      const headers = response.headers as AxiosResponseHeaders;
      
      siteInformation.server = String(headers['server'] || 'Not Disclosed');
      siteInformation.ipAddress = String(response.request?.socket?.remoteAddress || 'N/A');
      malwareAndSecurityItems.push(createCheckItem('Website Reachable', 'pass', 'Successfully connected to the website.'));

      if (headers['content-security-policy']) {
        malwareAndSecurityItems.push(createCheckItem('Content-Security-Policy (CSP)', 'pass', 'CSP header is implemented.'));
      } else {
        malwareAndSecurityItems.push(createCheckItem('Content-Security-Policy (CSP)', 'warn', 'CSP header is missing.'));
      }
      // Add more header checks here...
    } catch (fetchError: any) {
      malwareAndSecurityItems.push(createCheckItem('Website Fetch & Headers', 'fail', 'Could not connect to the website to analyze headers.', fetchError.message));
      siteInformation.ipAddress = 'N/A (Connection Failed)';
    }
    
    // --- MOCK DATA FOR OTHER SECTIONS (Replace with real logic) ---
    siteInformation.hosting = "MockHost Pro";
    siteInformation.cms = targetUrl.includes('blog') ? "WordPress (Simulated)" : "Custom Build (Simulated)";

    // Simulate specific checks for Malware & Blacklist details
    if (targetUrl.includes("malwareexample.com")) {
        malwareAndSecurityItems.push(createCheckItem('JS.Trojan.Fake Found', 'infected', 'A known trojan signature was detected.'));
        blacklistItems.push(createCheckItem("ExampleBadGuysList", 'blacklisted', "Reason: Distribution of malware."));
    } else if (targetUrl.includes("warningexample.com")) {
        malwareAndSecurityItems.push(createCheckItem('Outdated jQuery Version', 'warn', 'Version 1.12.4 detected, which has known vulnerabilities.'));
    } else {
        malwareAndSecurityItems.push(createCheckItem('Generic Malware Scan', 'clean', 'No common malware signatures found.'));
        blacklistItems.push(createCheckItem("Google Safe Browsing", 'not_blacklisted', "Domain clean."));
    }
    // --- End Mock Data ---


    // --- New Risk and Overall Status Determination Logic ---
    const allChecks = [...malwareAndSecurityItems, ...blacklistItems];
    
    const criticalFailures = allChecks.filter(r => r.status === 'infected' || r.status === 'blacklisted').length;
    const highRiskFailures = allChecks.filter(r => r.status === 'fail').length;
    const warnings = allChecks.filter(r => r.status === 'warn').length;

    if (criticalFailures > 0) {
      calculatedRiskLevel = 'Critical';
      calculatedOverallSeverity = 'danger';
      calculatedOverallStatusText = 'CRITICAL security issues detected! Immediate attention required.';
    } else if (highRiskFailures >= 2) {
      calculatedRiskLevel = 'High';
      calculatedOverallSeverity = 'danger';
      calculatedOverallStatusText = 'High security risk. Multiple vulnerabilities or issues found.';
    } else if (highRiskFailures === 1 || warnings >= 3) {
      calculatedRiskLevel = 'Medium';
      calculatedOverallSeverity = 'warning';
      calculatedOverallStatusText = 'Medium security risk. Some weaknesses or vulnerabilities present.';
    } else if (warnings > 0) {
      calculatedRiskLevel = 'Low';
      calculatedOverallSeverity = 'warning';
      calculatedOverallStatusText = 'Low security risk. Minor potential weaknesses found.';
    } else { // If no critical, high, medium, or low triggers
      calculatedRiskLevel = 'Minimal';
      calculatedOverallSeverity = 'good';
      calculatedOverallStatusText = 'Site passed basic security checks with minimal or no issues.';
    }

    // Update Malware Summary based on specific checks
    if (malwareAndSecurityItems.some(item => item.status === 'infected')) {
        currentMalwareSummary = createCheckItem("Malware Detected!", 'infected', "Active malware signatures found.");
    } else if (malwareAndSecurityItems.some(item => item.status === 'fail' || item.status === 'warn')) {
        currentMalwareSummary = createCheckItem("Security Issues/Warnings", 'warning', "Review detailed security checks.", true);
    } else {
        currentMalwareSummary = createCheckItem("No Malware Found", 'clean', "Scanner did not detect malware signatures.");
    }

    // Update Blacklist Summary based on specific checks
    if (blacklistItems.some(item => item.status === 'blacklisted')) {
        currentBlacklistSummary = createCheckItem("Site Blacklisted", 'blacklisted', "Found on one or more blacklists.");
    } else {
        currentBlacklistSummary = createCheckItem("Site Not Blacklisted", 'not_blacklisted', `${blacklistItems.length} common blacklists checked.`;
    }

    currentOverallScanMessage = "This automated scan provides a snapshot of basic security indicators. For in-depth analysis and guaranteed protection, consult with cybersecurity professionals.";
    // --- End New Risk and Overall Status Determination Logic ---

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const responsePayload: ApiSecurityScanResponse = {
      url: targetUrl,
      scanDate: new Date().toISOString(),
      overallStatusText: calculatedOverallStatusText,
      overallStatusSeverity: calculatedOverallSeverity,
      results: [], // Keeping this for potential future use or if some UI part still expects it. Can be allChecks.
      malwareSummary: currentMalwareSummary,
      blacklistSummary: currentBlacklistSummary,
      siteInfo: siteInformation,
      securityRisk: calculatedRiskLevel,
      overallScanMessage: currentOverallScanMessage,
      malwareAndSecurityDetails: malwareAndSecurityItems,
      blacklistStatusDetails: blacklistItems,
    };
    
    console.log("[API /security-scan] Sending payload (summary):", 
      { url: responsePayload.url, overall: responsePayload.overallStatusText, risk: responsePayload.securityRisk }
    );
    return res.status(200).json(responsePayload);

  } catch (error: any) {
    const R_URL = String(requestedUrlInput || req.body?.url || 'unknown');
    console.error(`[API /security-scan] CRITICAL ERROR in handler for URL ${R_URL}:`, error.message, error.stack);
    let errorMessage = `Failed to perform security scan.`;
    if (error instanceof z.ZodError) {
      errorMessage = 'Validation failed: ' + error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ message: errorMessage, errorDetails: error.errors });
    }
    if (error.message) { errorMessage = error.message; }
    return res.status(500).json({ 
        message: `Error during security scan.`, 
        errorDetails: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}