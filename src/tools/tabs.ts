import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep, newTab, switchTab, closeTab, listTabsAsync } from '../session/manager.js';

// New Tab
export const newTabInputSchema = z.object({
  url: z.string().optional().describe('URL to open in the new tab (optional)'),
  description: z.string().describe('Description of this action for documentation'),
});

export type NewTabInput = z.infer<typeof newTabInputSchema>;

export async function newTabTool(input: NewTabInput) {
  const session = requireSession();
  const startTime = Date.now();

  const { pageId, page } = await newTab(input.url);

  const duration = Date.now() - startTime;

  // Take screenshot if enabled
  let screenshotPath: string | undefined;
  if (session.options.screenshotOnStep) {
    const stepNum = session.steps.length + 1;
    screenshotPath = path.join(session.options.outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  // Record step
  const step = addStep({
    action: 'newTab',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      url: input.url,
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    pageId,
    url: input.url || 'about:blank',
    duration,
  };
}

// Switch Tab
export const switchTabInputSchema = z.object({
  pageId: z.number().describe('ID of the tab to switch to'),
  description: z.string().describe('Description of this action for documentation'),
});

export type SwitchTabInput = z.infer<typeof switchTabInputSchema>;

export async function switchTabTool(input: SwitchTabInput) {
  const session = requireSession();
  const startTime = Date.now();

  const page = await switchTab(input.pageId);

  const duration = Date.now() - startTime;

  // Take screenshot if enabled
  let screenshotPath: string | undefined;
  if (session.options.screenshotOnStep) {
    const stepNum = session.steps.length + 1;
    screenshotPath = path.join(session.options.outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  // Record step
  const step = addStep({
    action: 'switchTab',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      ref: String(input.pageId),
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    pageId: input.pageId,
    url: page.url(),
    duration,
  };
}

// Close Tab
export const closeTabInputSchema = z.object({
  pageId: z.number().describe('ID of the tab to close'),
  description: z.string().describe('Description of this action for documentation'),
});

export type CloseTabInput = z.infer<typeof closeTabInputSchema>;

export async function closeTabTool(input: CloseTabInput) {
  const session = requireSession();
  const startTime = Date.now();

  await closeTab(input.pageId);

  const duration = Date.now() - startTime;

  // Take screenshot of the new active tab
  let screenshotPath: string | undefined;
  if (session.options.screenshotOnStep && session.page) {
    const stepNum = session.steps.length + 1;
    screenshotPath = path.join(session.options.outputDir, 'assets', `step-${String(stepNum).padStart(3, '0')}.png`);
    await session.page.screenshot({ path: screenshotPath });
  }

  // Record step
  const step = addStep({
    action: 'closeTab',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      ref: String(input.pageId),
    },
    evidence: {
      screenshotPath,
    },
    success: true,
  });

  return {
    success: true,
    step: step.id,
    closedPageId: input.pageId,
    duration,
  };
}

// List Tabs
export const listTabsInputSchema = z.object({});

export type ListTabsInput = z.infer<typeof listTabsInputSchema>;

export async function listTabsTool(_input: ListTabsInput) {
  const tabs = await listTabsAsync();

  return {
    success: true,
    tabs,
    activePageId: tabs.find(t => t.isActive)?.pageId,
  };
}
