import { z } from 'zod';
import { requireSession } from '../session/manager.js';
import { getAccessibilitySnapshot } from '../utils/snapshot.js';

export const snapshotInputSchema = z.object({});

export type SnapshotInput = z.infer<typeof snapshotInputSchema>;

export async function snapshot(_input: SnapshotInput) {
  const session = requireSession();
  const page = session.page!;

  const snapshotText = await getAccessibilitySnapshot(page);
  const url = page.url();
  const title = await page.title();

  return {
    url,
    title,
    snapshot: snapshotText,
  };
}
