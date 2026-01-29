import * as path from 'path';
import type { DemoSession } from '../types.js';

/**
 * Generate a Markdown guide from the demo session
 */
export function generateMarkdownGuide(session: DemoSession): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${session.title}`);
  lines.push('');

  // Summary
  const successCount = session.steps.filter(s => s.success).length;
  const totalDuration = session.steps.reduce((sum, s) => sum + s.duration, 0);

  lines.push('## 概览');
  lines.push('');
  lines.push(`- **起始 URL**: ${session.startUrl}`);
  lines.push(`- **总步骤数**: ${session.steps.length}`);
  lines.push(`- **成功率**: ${Math.round((successCount / session.steps.length) * 100)}%`);
  lines.push(`- **总耗时**: ${(totalDuration / 1000).toFixed(1)} 秒`);
  lines.push('');

  // Steps
  lines.push('## 操作步骤');
  lines.push('');

  for (const step of session.steps) {
    lines.push(`### 步骤 ${step.id}: ${step.description}`);
    lines.push('');

    // Screenshot
    if (step.evidence.screenshotPath) {
      const relativePath = path.basename(step.evidence.screenshotPath);
      lines.push(`![步骤${step.id}截图](assets/${relativePath})`);
      lines.push('');
    }

    // Details
    if (step.details.url) {
      lines.push(`- **URL**: ${step.details.url}`);
    }
    if (step.details.value) {
      lines.push(`- **输入值**: \`${step.details.value}\``);
    }

    // Status
    if (!step.success && step.error) {
      lines.push(`- **状态**: ❌ 失败`);
      lines.push(`- **错误**: ${step.error}`);
    } else {
      lines.push(`- **状态**: ✅ 成功`);
    }

    lines.push(`- **耗时**: ${step.duration}ms`);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*本文档由 demosmith 自动生成于 ${new Date().toISOString()}*`);

  return lines.join('\n');
}
