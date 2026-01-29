/**
 * Template system for customizable output generation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { DemoSession, DemoStep } from '../types.js';
import { getLanguage, t, getActionName, formatDuration } from './i18n.js';

export interface TemplateContext {
  session: {
    id: string;
    title: string;
    startUrl: string;
    startedAt: string;
    totalSteps: number;
    totalDuration: number;
    successRate: number;
  };
  steps: Array<{
    id: number;
    action: string;
    actionName: string;
    description: string;
    duration: number;
    durationFormatted: string;
    success: boolean;
    error?: string;
    screenshotPath?: string;
    screenshotRelative?: string;
    details: Record<string, any>;
  }>;
  meta: {
    generatedAt: string;
    language: string;
    version: string;
  };
  i18n: ReturnType<typeof t>;
}

/**
 * Build template context from session
 */
export function buildTemplateContext(session: DemoSession): TemplateContext {
  const totalDuration = session.steps.reduce((sum, s) => sum + s.duration, 0);
  const successCount = session.steps.filter(s => s.success).length;

  return {
    session: {
      id: session.id,
      title: session.title,
      startUrl: session.startUrl,
      startedAt: session.startedAt.toISOString(),
      totalSteps: session.steps.length,
      totalDuration,
      successRate: session.steps.length > 0 ? successCount / session.steps.length : 1,
    },
    steps: session.steps.map(step => ({
      id: step.id,
      action: step.action,
      actionName: getActionName(step.action),
      description: step.description,
      duration: step.duration,
      durationFormatted: formatDuration(step.duration),
      success: step.success,
      error: step.error,
      screenshotPath: step.evidence.screenshotPath,
      screenshotRelative: step.evidence.screenshotPath
        ? path.relative(session.options.outputDir, step.evidence.screenshotPath).replace(/\\/g, '/')
        : undefined,
      details: step.details,
    })),
    meta: {
      generatedAt: new Date().toISOString(),
      language: getLanguage(),
      version: '0.1.0',
    },
    i18n: t(),
  };
}

/**
 * Simple template engine with Mustache-like syntax
 *
 * Supports:
 * - {{variable}} - variable substitution
 * - {{#array}}...{{/array}} - array iteration
 * - {{#if condition}}...{{/if}} - conditionals
 * - {{#unless condition}}...{{/unless}} - negative conditionals
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
  let result = template;

  // Handle {{#each array}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, arrayName, content) => {
      const array = getNestedValue(context, arrayName);
      if (!Array.isArray(array)) return '';
      return array.map((item, index) => {
        const itemContext = { ...context, this: item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 };
        return renderTemplate(content, itemContext);
      }).join('');
    }
  );

  // Handle {{#if condition}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\S+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, condition, content) => {
      const value = getNestedValue(context, condition);
      return value ? renderTemplate(content, context) : '';
    }
  );

  // Handle {{#unless condition}}...{{/unless}} blocks
  result = result.replace(
    /\{\{#unless\s+(\S+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, condition, content) => {
      const value = getNestedValue(context, condition);
      return !value ? renderTemplate(content, context) : '';
    }
  );

  // Handle {{variable}} substitutions
  result = result.replace(
    /\{\{([^#/][^}]*)\}\}/g,
    (_, path) => {
      const value = getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : '';
    }
  );

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  // Handle 'this' reference
  if (path === 'this' || path.startsWith('this.')) {
    if (path === 'this') return obj.this;
    path = path.replace('this.', '');
    obj = obj.this || obj;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Load template from file
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  return fs.readFile(templatePath, 'utf-8');
}

/**
 * Render session with custom template file
 */
export async function renderWithTemplate(
  session: DemoSession,
  templatePath: string
): Promise<string> {
  const template = await loadTemplate(templatePath);
  const context = buildTemplateContext(session);
  return renderTemplate(template, context as any);
}

// Default templates

export const defaultMarkdownTemplate = `# {{session.title}}

> Generated on {{meta.generatedAt}}

## Overview

- **Start URL:** {{session.startUrl}}
- **Total Steps:** {{session.totalSteps}}
- **Duration:** {{session.totalDuration}}ms
- **Success Rate:** {{session.successRate}}

## Steps

{{#each steps}}
### {{i18n.ui.step}} {{this.id}}: {{this.description}}

**Action:** {{this.actionName}} | **Duration:** {{this.durationFormatted}}

{{#if this.screenshotRelative}}
![Step {{this.id}}]({{this.screenshotRelative}})
{{/if}}

{{#unless this.success}}
> ⚠️ Error: {{this.error}}
{{/unless}}

{{/each}}

---

*{{i18n.ui.generatedBy}}*
`;

export const defaultNarrationTemplate = `{{i18n.narration.intro session.title}}

{{#each steps}}
{{i18n.narration.stepPrefix this.id}} {{this.description}}

{{/each}}
{{i18n.narration.outro}}
`;
