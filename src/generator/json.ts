import type { DemoSession } from '../types.js';

export interface StepsJson {
  sessionId: string;
  title: string;
  startUrl: string;
  startedAt: string;
  completedAt: string;
  summary: {
    totalSteps: number;
    successCount: number;
    failureCount: number;
    totalDuration: number;
  };
  steps: Array<{
    id: number;
    action: string;
    description: string;
    timestamp: string;
    duration: number;
    details: {
      ref?: string;
      selector?: string;
      value?: string;
      url?: string;
    };
    evidence: {
      screenshotPath?: string;
    };
    success: boolean;
    error?: string;
  }>;
}

/**
 * Generate JSON steps data from the demo session
 */
export function generateStepsJson(session: DemoSession): StepsJson {
  const successCount = session.steps.filter(s => s.success).length;
  const totalDuration = session.steps.reduce((sum, s) => sum + s.duration, 0);

  return {
    sessionId: session.id,
    title: session.title,
    startUrl: session.startUrl,
    startedAt: session.startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    summary: {
      totalSteps: session.steps.length,
      successCount,
      failureCount: session.steps.length - successCount,
      totalDuration,
    },
    steps: session.steps.map(step => ({
      id: step.id,
      action: step.action,
      description: step.description,
      timestamp: step.timestamp.toISOString(),
      duration: step.duration,
      details: step.details,
      evidence: {
        screenshotPath: step.evidence.screenshotPath,
      },
      success: step.success,
      error: step.error,
    })),
  };
}
