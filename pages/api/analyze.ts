// pages/api/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/nextauth'; // Corrected path
import prisma from '@/lib/prisma';
import lighthouse from 'lighthouse'; // Assuming default export
import puppeteer, { Browser as PuppeteerBrowser } from 'puppeteer';

// --- TYPE DEFINITIONS ---
// This type will be EXPORTED and used by the frontend
export interface FullLighthouseDetails {
  categories: any; // Lighthouse LHR categories object
  audits: any;     // Lighthouse LHR audits object
  timing: any;     // Lighthouse LHR timing object
  finalUrl: string;
  lighthouseVersion: string;
  fetchTime: string; // ISO string of when the page was fetched
  // finalScreenshotData?: string; // Optional: base64 data URI if you decide to send it
}

// This is the main data structure returned by this API endpoint
// It will also be EXPORTED and used by the frontend
export type ApiAnalyzeResponseData = {
  url: string;
  strategy: string;
  performanceScore?: number | null;
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  seoScore?: number | null;
  pwaScore?: number | null; // Keep or remove based on your PWA decision
  fullLighthouseDetails: FullLighthouseDetails | null; 
};
// --- END TYPE DEFINITIONS ---

const analyzeSchema = z.object({
  url: z.string().url({ message: 'Invalid URL format. Please include http:// or https://' }),
  strategy: z.enum(['desktop', 'mobile']),
});

// Update the handler's response type to use ApiAnalyzeResponseData for success cases
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiAnalyzeResponseData | { message: string, errorDetails?: string, stack?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  let browser: PuppeteerBrowser | null = null;
  const { url: requestedUrlInput, strategy: requestedStrategyInput } = req.body;

  try {
    const validatedData = analyzeSchema.parse(req.body);
    const { url, strategy } = validatedData;

    console.log(`[API /analyze] Starting Lighthouse analysis for: ${url} (Strategy: ${strategy})`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    console.log(`[API /analyze] Puppeteer browser launched for ${url} (${strategy}).`);

    const browserWSEndpoint = browser.wsEndpoint();
    const puppeteerPortStr = new URL(browserWSEndpoint).port;

    if (!puppeteerPortStr) {
        console.error(`[API /analyze] Failed to get Puppeteer port for ${url} (${strategy}). WSEndpoint:`, browserWSEndpoint);
        // Ensure browser is closed if it was launched before this error
        if (browser) await browser.close();
        return res.status(500).json({ message: 'Internal server error: Puppeteer port not found.' });
    }
    const puppeteerPort = parseInt(puppeteerPortStr);
    console.log(`[API /analyze] Puppeteer listening on port: ${puppeteerPort} for ${url} (${strategy})`);

    const lighthouseOptions: any = {
      port: puppeteerPort,
      output: 'json',
      logLevel: 'info',
    };

    let currentThrottlingSettings;
    let currentScreenEmulation;
    let currentCategories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];

    if (strategy === 'mobile') {
      currentThrottlingSettings = { 
        rttMs: 150, throughputKbps: 1.6 * 1024, requestLatencyMs: 150 * 0.4, 
        downloadThroughputKbps: 1.6 * 1024 * 0.9, uploadThroughputKbps: 750 * 0.9, 
        cpuSlowdownMultiplier: 4 
      };
      currentScreenEmulation = { mobile: true, width: 360, height: 640, deviceScaleFactor: 2 };
    } else { // Desktop
      currentThrottlingSettings = {
        rttMs: 100, throughputKbps: 5 * 1024, cpuSlowdownMultiplier: 2, 
        requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0
      };
      currentScreenEmulation = { mobile: false, width: 1280, height: 720, deviceScaleFactor: 1 };
    }

    const lighthouseConfig: any = {
      extends: 'lighthouse:default',
      settings: {
        formFactor: strategy,
        throttlingMethod: 'simulate',
        throttling: currentThrottlingSettings,
        screenEmulation: currentScreenEmulation,
        onlyCategories: currentCategories,
      },
    };
    console.log(`[API /analyze] Lighthouse config for ${strategy}:`, JSON.stringify(lighthouseConfig.settings));

    let runnerResult;
    try {
        runnerResult = await lighthouse(url, lighthouseOptions, lighthouseConfig);
        console.log(`[API /analyze] Lighthouse run completed for ${url} (${strategy}).`);
    } catch (lighthouseError: any) {
        console.error(`[API /analyze] Lighthouse execution itself threw an error for URL ${url} (Strategy: ${strategy}):`, lighthouseError.message);
        if (lighthouseError.message && lighthouseError.message.includes('performance mark has not been set')) {
             throw new Error(`Lighthouse failed early (Strategy: ${strategy}) for URL: ${url}. Site may be incompatible. Original: ${lighthouseError.message}`);
        }
        throw lighthouseError;
    }

    if (!runnerResult || !runnerResult.lhr) {
      console.error(`[API /analyze] Lighthouse analysis failed to return a report (lhr) for URL ${url} (Strategy: ${strategy}).`);
      throw new Error('Lighthouse analysis failed to produce a report.'); // Throw to be caught by main try-catch
    }

    const lhr = runnerResult.lhr;

    // Prepare the data for the response, matching ApiAnalyzeResponseData
    const responseData: ApiAnalyzeResponseData = {
      url,
      strategy,
      performanceScore: lhr.categories.performance?.score != null ? Math.round(lhr.categories.performance.score * 100) : null,
      accessibilityScore: lhr.categories.accessibility?.score != null ? Math.round(lhr.categories.accessibility.score * 100) : null,
      bestPracticesScore: lhr.categories['best-practices']?.score != null ? Math.round(lhr.categories['best-practices'].score * 100) : null,
      seoScore: lhr.categories.seo?.score != null ? Math.round(lhr.categories.seo.score * 100) : null,
      pwaScore: lhr.categories.pwa?.score != null ? Math.round(lhr.categories.pwa.score * 100) : null,
      fullLighthouseDetails: { // Populate with more detailed data
        categories: lhr.categories,
        audits: lhr.audits,
        timing: lhr.timing,
        finalUrl: lhr.finalUrl,
        lighthouseVersion: lhr.lighthouseVersion,
        fetchTime: lhr.fetchTime,
        // finalScreenshotData: lhr.audits['final-screenshot']?.details?.data, // If you choose to include it
      }
    };

    if (userId) {
      try {
        await prisma.report.create({
          data: { // Data for Prisma model
            url: responseData.url, 
            strategy: responseData.strategy,
            performanceScore: responseData.performanceScore, 
            accessibilityScore: responseData.accessibilityScore,
            bestPracticesScore: responseData.bestPracticesScore, 
            seoScore: responseData.seoScore,
            pwaScore: responseData.pwaScore,
            metrics: lhr.categories, // Storing categories summary in DB 'metrics' field
            userId: userId,
          },
        });
        console.log(`[API /analyze] Lighthouse report saved for user ${userId}, URL ${url} (${strategy})`);
      } catch (dbError) {
        console.error(`[API /analyze] Error saving Lighthouse report to DB for URL ${url} (${strategy}):`, dbError);
      }
    }
    
    console.log(`[API /analyze] Successfully processed Lighthouse report for: ${url} (${strategy})`);
    return res.status(200).json(responseData); // Send the ApiAnalyzeResponseData structure

  } catch (error: any) {
    const R_URL = typeof req?.body === 'object' && req.body !== null && 'url' in req.body && typeof req.body.url === 'string' ? req.body.url : String(requestedUrlInput || 'unknown');
    const R_STRATEGY = typeof req?.body === 'object' && req.body !== null && 'strategy' in req.body && typeof req.body.strategy === 'string' ? req.body.strategy : String(requestedStrategyInput || 'unknown');

    console.error(`[API /analyze] CRITICAL ERROR in handler for URL ${R_URL} (Strategy: ${R_STRATEGY}):`, error.message, error.stack);
    
    let errorMessage = `Failed to perform Lighthouse analysis for ${R_STRATEGY}.`;
    if (error instanceof z.ZodError) {
      errorMessage = 'Validation failed: ' + error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ message: errorMessage, errors: error.errors });
    }
    
    if (error.message) {
        if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Could not resolve/connect to URL: ${R_URL}. Check URL & site status.`;
        } else if (error.message.includes('Protocol error') && error.message.includes('Target closed')) {
            errorMessage = `Browser tab crashed/closed for URL: ${R_URL}.`;
        } else if (error.message.includes('Failed to launch the browser process')) {
            errorMessage = `Failed to launch browser. Check server logs for Puppeteer/Chrome issues.`;
        } else if (error.message.includes('performance mark has not been set') || error.message.includes('Lighthouse failed early') || error.message.includes('Lighthouse analysis failed to produce a report')) {
            errorMessage = error.message; 
        } else {
            errorMessage = `An unexpected error occurred: ${error.message}`;
        }
    }
    
    return res.status(500).json({ 
        message: `Error during Lighthouse analysis for ${R_STRATEGY}.`, 
        errorDetails: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (browser) {
      try {
        console.log(`[API /analyze] Finally block: Closing browser for URL ${requestedUrlInput || 'unknown'} (Strategy: ${requestedStrategyInput || 'unknown'}).`);
        await browser.close();
        console.log(`[API /analyze] Finally block: Browser closed for URL ${requestedUrlInput || 'unknown'} (Strategy: ${requestedStrategyInput || 'unknown'}).`);
      } catch (closeError: any) {
        console.error(`[API /analyze] Finally block: Error closing browser for URL ${requestedUrlInput || 'unknown'} (Strategy: ${requestedStrategyInput || 'unknown'}):`, closeError.message);
      }
    }
  }
}