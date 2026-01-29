import { z } from 'zod';
import * as path from 'path';
import { requireSession, addStep } from '../session/manager.js';
import { getElementByRef } from '../utils/selector.js';

export const assertInputSchema = z.object({
  type: z.enum(['text', 'visible', 'hidden', 'url', 'title', 'value', 'checked', 'enabled', 'disabled', 'count'])
    .describe('Type of assertion to perform'),
  ref: z.string().optional().describe('Ref of the element to check (for element-based assertions)'),
  expected: z.string().optional().describe('Expected value (for text, url, title, value assertions)'),
  pattern: z.string().optional().describe('Regex pattern to match (alternative to exact expected value)'),
  count: z.number().optional().describe('Expected count (for count assertion)'),
  description: z.string().describe('Description of this assertion for documentation'),
});

export type AssertInput = z.infer<typeof assertInputSchema>;

export async function assert(input: AssertInput) {
  const session = requireSession();
  const page = session.page!;
  const startTime = Date.now();

  let passed = false;
  let actual: string | number | boolean | undefined;
  let message = '';

  try {
    switch (input.type) {
      case 'text': {
        if (!input.ref) throw new Error('ref is required for text assertion');
        const element = await getElementByRef(page, input.ref);
        if (!element) throw new Error(`Element with ref "${input.ref}" not found`);
        actual = await element.textContent() || '';
        if (input.pattern) {
          passed = new RegExp(input.pattern).test(actual);
          message = passed ? `Text matches pattern "${input.pattern}"` : `Text "${actual}" does not match pattern "${input.pattern}"`;
        } else if (input.expected !== undefined) {
          passed = actual.includes(input.expected);
          message = passed ? `Text contains "${input.expected}"` : `Text "${actual}" does not contain "${input.expected}"`;
        }
        break;
      }

      case 'visible': {
        if (!input.ref) throw new Error('ref is required for visible assertion');
        const element = await getElementByRef(page, input.ref);
        passed = element !== null && await element.isVisible();
        actual = passed;
        message = passed ? 'Element is visible' : 'Element is not visible';
        break;
      }

      case 'hidden': {
        if (!input.ref) throw new Error('ref is required for hidden assertion');
        const element = await getElementByRef(page, input.ref);
        passed = element === null || !(await element.isVisible());
        actual = !passed;
        message = passed ? 'Element is hidden' : 'Element is visible (expected hidden)';
        break;
      }

      case 'url': {
        actual = page.url();
        if (input.pattern) {
          passed = new RegExp(input.pattern).test(actual);
          message = passed ? `URL matches pattern "${input.pattern}"` : `URL "${actual}" does not match pattern "${input.pattern}"`;
        } else if (input.expected !== undefined) {
          passed = actual.includes(input.expected);
          message = passed ? `URL contains "${input.expected}"` : `URL "${actual}" does not contain "${input.expected}"`;
        }
        break;
      }

      case 'title': {
        actual = await page.title();
        if (input.pattern) {
          passed = new RegExp(input.pattern).test(actual);
          message = passed ? `Title matches pattern "${input.pattern}"` : `Title "${actual}" does not match pattern "${input.pattern}"`;
        } else if (input.expected !== undefined) {
          passed = actual.includes(input.expected);
          message = passed ? `Title contains "${input.expected}"` : `Title "${actual}" does not contain "${input.expected}"`;
        }
        break;
      }

      case 'value': {
        if (!input.ref) throw new Error('ref is required for value assertion');
        const element = await getElementByRef(page, input.ref);
        if (!element) throw new Error(`Element with ref "${input.ref}" not found`);
        actual = await element.inputValue();
        if (input.pattern) {
          passed = new RegExp(input.pattern).test(actual);
          message = passed ? `Value matches pattern "${input.pattern}"` : `Value "${actual}" does not match pattern "${input.pattern}"`;
        } else if (input.expected !== undefined) {
          passed = actual === input.expected;
          message = passed ? `Value equals "${input.expected}"` : `Value "${actual}" does not equal "${input.expected}"`;
        }
        break;
      }

      case 'checked': {
        if (!input.ref) throw new Error('ref is required for checked assertion');
        const element = await getElementByRef(page, input.ref);
        if (!element) throw new Error(`Element with ref "${input.ref}" not found`);
        actual = await element.isChecked();
        passed = actual === true;
        message = passed ? 'Element is checked' : 'Element is not checked';
        break;
      }

      case 'enabled': {
        if (!input.ref) throw new Error('ref is required for enabled assertion');
        const element = await getElementByRef(page, input.ref);
        if (!element) throw new Error(`Element with ref "${input.ref}" not found`);
        actual = await element.isEnabled();
        passed = actual === true;
        message = passed ? 'Element is enabled' : 'Element is disabled';
        break;
      }

      case 'disabled': {
        if (!input.ref) throw new Error('ref is required for disabled assertion');
        const element = await getElementByRef(page, input.ref);
        if (!element) throw new Error(`Element with ref "${input.ref}" not found`);
        actual = await element.isDisabled();
        passed = actual === true;
        message = passed ? 'Element is disabled' : 'Element is enabled';
        break;
      }

      case 'count': {
        if (!input.ref) throw new Error('ref is required for count assertion');
        // For count, we use ref as a selector pattern
        const elements = await page.locator(`[data-ref="${input.ref}"]`).all();
        actual = elements.length;
        if (input.count !== undefined) {
          passed = actual === input.count;
          message = passed ? `Found ${actual} elements` : `Expected ${input.count} elements, found ${actual}`;
        }
        break;
      }
    }
  } catch (error) {
    passed = false;
    message = error instanceof Error ? error.message : String(error);
  }

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
    action: 'assert',
    description: input.description,
    timestamp: new Date(),
    duration,
    details: {
      type: input.type,
      ref: input.ref,
      expected: input.expected || input.pattern || String(input.count),
      actual: String(actual),
      message,
    },
    evidence: {
      screenshotPath,
    },
    success: passed,
    error: passed ? undefined : message,
  });

  return {
    success: true,
    passed,
    step: step.id,
    type: input.type,
    actual,
    message,
    duration,
  };
}
