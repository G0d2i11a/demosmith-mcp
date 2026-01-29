import { z } from 'zod';
import { startSession } from '../session/manager.js';

export const startInputSchema = z.object({
  url: z.string().url().describe('The starting URL for the demo'),
  title: z.string().describe('Title of the demo (used in documentation)'),
  outputDir: z.string().optional().describe('Output directory for deliverables (default: temp dir)'),
  video: z.boolean().default(true).describe('Record video'),
  trace: z.boolean().default(true).describe('Record Playwright trace'),
  screenshotOnStep: z.boolean().default(true).describe('Take screenshot on each step'),
  storageState: z.string().optional().describe('Path to storage state file for login session'),
  headless: z.boolean().default(false).describe('Run browser in headless mode'),
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(720),
  }).optional().describe('Browser viewport size'),
});

export type StartInput = z.infer<typeof startInputSchema>;

export async function start(input: StartInput) {
  const session = await startSession({
    url: input.url,
    title: input.title,
    outputDir: input.outputDir,
    video: input.video,
    trace: input.trace,
    screenshotOnStep: input.screenshotOnStep,
    storageState: input.storageState,
    headless: input.headless,
    viewport: input.viewport,
  });

  return {
    sessionId: session.id,
    title: session.title,
    startUrl: session.startUrl,
    outputDir: session.options.outputDir,
    options: {
      video: session.options.video,
      trace: session.options.trace,
      screenshotOnStep: session.options.screenshotOnStep,
    },
  };
}
