import { z } from 'zod';
import { endSession, getSession } from '../session/manager.js';
import { packageDeliverables } from '../generator/packager.js';

export const endInputSchema = z.object({});

export type EndInput = z.infer<typeof endInputSchema>;

export async function end(_input: EndInput) {
  const session = getSession();
  if (!session) {
    return {
      success: false,
      error: 'No active demo session',
    };
  }

  // End the session (closes browser, saves trace)
  const completedSession = await endSession();
  if (!completedSession) {
    return {
      success: false,
      error: 'Failed to end session',
    };
  }

  // Package deliverables
  const deliverables = await packageDeliverables(completedSession);

  return {
    success: true,
    deliverables,
  };
}
