import { z } from 'zod';
import { getSession } from '../session/manager.js';

export const statusInputSchema = z.object({});

export type StatusInput = z.infer<typeof statusInputSchema>;

export async function status(_input: StatusInput) {
  const session = getSession();

  if (!session) {
    return {
      active: false,
      message: 'No active demo session. Use demosmith_start to begin.',
    };
  }

  const successCount = session.steps.filter(s => s.success).length;
  const totalDuration = session.steps.reduce((sum, s) => sum + s.duration, 0);

  return {
    active: true,
    sessionId: session.id,
    title: session.title,
    startUrl: session.startUrl,
    status: session.status,
    outputDir: session.options.outputDir,
    options: {
      video: session.options.video,
      trace: session.options.trace,
      screenshotOnStep: session.options.screenshotOnStep,
    },
    progress: {
      totalSteps: session.steps.length,
      successCount,
      failureCount: session.steps.length - successCount,
      totalDuration,
    },
    currentUrl: session.page?.url() ?? 'unknown',
  };
}
