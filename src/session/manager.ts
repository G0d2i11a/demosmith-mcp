import { randomUUID } from 'crypto';
import * as path from 'path';
import * as os from 'os';
import type { Page } from 'playwright';
import type { DemoSession, DemoSessionOptions, DemoStep } from '../types.js';
import { launchBrowser, closeBrowser } from './browser.js';

// Global session store (single session at a time for simplicity)
let currentSession: DemoSession | null = null;

export interface StartSessionInput {
  url: string;
  title: string;
  outputDir?: string;
  video?: boolean;
  trace?: boolean;
  screenshotOnStep?: boolean;
  storageState?: string;
  headless?: boolean;
  viewport?: { width: number; height: number };
}

export async function startSession(input: StartSessionInput): Promise<DemoSession> {
  // Close existing session if any
  if (currentSession) {
    await endSession();
  }

  const sessionId = randomUUID().slice(0, 8);
  const defaultOutputDir = path.join(os.tmpdir(), 'demosmith', sessionId);

  const options: DemoSessionOptions = {
    video: input.video ?? true,
    trace: input.trace ?? true,
    screenshotOnStep: input.screenshotOnStep ?? true,
    outputDir: input.outputDir ?? defaultOutputDir,
    storageState: input.storageState,
    headless: input.headless ?? false,
    viewport: input.viewport ?? { width: 1280, height: 720 },
  };

  const session: DemoSession = {
    id: sessionId,
    title: input.title,
    startUrl: input.url,
    startedAt: new Date(),
    status: 'running',
    options,
    steps: [],
    videoStartTime: Date.now(), // Record when session starts for video timing
    pages: new Map(),
    activePageId: 0,
    nextPageId: 1,
  };

  // Launch browser
  const { browser, context, page } = await launchBrowser(options);
  session.browser = browser;
  session.context = context;
  session.page = page;

  // Initialize multi-tab support
  session.pages.set(0, page);

  // Navigate to start URL
  await page.goto(input.url, { waitUntil: 'domcontentloaded' });

  currentSession = session;
  return session;
}

export async function endSession(): Promise<DemoSession | null> {
  if (!currentSession) {
    return null;
  }

  const session = currentSession;
  session.status = 'completed';

  // Close browser and get video path
  await closeBrowser(session);

  // Clear references
  session.browser = undefined;
  session.context = undefined;
  session.page = undefined;
  session.pages.clear();

  currentSession = null;
  return session;
}

export function getSession(): DemoSession | null {
  return currentSession;
}

export function requireSession(): DemoSession {
  if (!currentSession) {
    throw new Error('No active demo session. Call demosmith_start first.');
  }
  if (!currentSession.page) {
    throw new Error('Session page is not available.');
  }
  return currentSession;
}

export function addStep(step: Omit<DemoStep, 'id'>): DemoStep {
  const session = requireSession();
  const fullStep: DemoStep = {
    ...step,
    id: session.steps.length + 1,
  };
  session.steps.push(fullStep);
  return fullStep;
}

// Multi-tab management functions

export async function newTab(url?: string): Promise<{ pageId: number; page: Page }> {
  const session = requireSession();
  if (!session.context) {
    throw new Error('Browser context is not available');
  }

  const page = await session.context.newPage();
  const pageId = session.nextPageId++;
  session.pages.set(pageId, page);

  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  return { pageId, page };
}

export async function switchTab(pageId: number): Promise<Page> {
  const session = requireSession();
  const page = session.pages.get(pageId);

  if (!page) {
    throw new Error(`Tab with id ${pageId} not found`);
  }

  session.activePageId = pageId;
  session.page = page;

  // Bring the page to front
  await page.bringToFront();

  return page;
}

export async function closeTab(pageId: number): Promise<void> {
  const session = requireSession();
  const page = session.pages.get(pageId);

  if (!page) {
    throw new Error(`Tab with id ${pageId} not found`);
  }

  // Cannot close the last tab
  if (session.pages.size === 1) {
    throw new Error('Cannot close the last tab');
  }

  await page.close();
  session.pages.delete(pageId);

  // If we closed the active tab, switch to another one
  if (session.activePageId === pageId) {
    const remainingIds = Array.from(session.pages.keys());
    await switchTab(remainingIds[0]);
  }
}

export function listTabs(): Array<{ pageId: number; url: string; title: string; isActive: boolean }> {
  const session = requireSession();
  const tabs: Array<{ pageId: number; url: string; title: string; isActive: boolean }> = [];

  for (const [pageId, page] of session.pages) {
    tabs.push({
      pageId,
      url: page.url(),
      title: '', // Will be filled async
      isActive: pageId === session.activePageId,
    });
  }

  return tabs;
}

export async function listTabsAsync(): Promise<Array<{ pageId: number; url: string; title: string; isActive: boolean }>> {
  const session = requireSession();
  const tabs: Array<{ pageId: number; url: string; title: string; isActive: boolean }> = [];

  for (const [pageId, page] of session.pages) {
    tabs.push({
      pageId,
      url: page.url(),
      title: await page.title(),
      isActive: pageId === session.activePageId,
    });
  }

  return tabs;
}
