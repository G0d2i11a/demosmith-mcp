#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool imports - Core
import { start, startInputSchema } from './tools/start.js';
import { end, endInputSchema } from './tools/end.js';
import { navigate, navigateInputSchema } from './tools/navigate.js';
import { click, clickInputSchema } from './tools/click.js';
import { fill, fillInputSchema } from './tools/fill.js';
import { select, selectInputSchema } from './tools/select.js';
import { screenshot, screenshotInputSchema } from './tools/screenshot.js';
import { wait, waitInputSchema } from './tools/wait.js';
import { scroll, scrollInputSchema } from './tools/scroll.js';
import { snapshot, snapshotInputSchema } from './tools/snapshot.js';
import { status, statusInputSchema } from './tools/status.js';

// Tool imports - New actions
import { pressKey, pressKeyInputSchema } from './tools/press-key.js';
import { drag, dragInputSchema } from './tools/drag.js';
import { upload, uploadInputSchema } from './tools/upload.js';
import { hover, hoverInputSchema } from './tools/hover.js';
import { assert, assertInputSchema } from './tools/assert.js';

// Tool imports - Tab management
import {
  newTabTool, newTabInputSchema,
  switchTabTool, switchTabInputSchema,
  closeTabTool, closeTabInputSchema,
  listTabsTool, listTabsInputSchema,
} from './tools/tabs.js';

import { z } from 'zod';

// Convert Zod schema to JSON Schema
function zodToJsonSchema(schema: z.ZodType<any>): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType<any>;
      properties[key] = zodToJsonSchema(zodValue);

      // Check if required (not optional and no default)
      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    const result: any = { type: 'string' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  if (schema instanceof z.ZodNumber) {
    const result: any = { type: 'number' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  if (schema instanceof z.ZodBoolean) {
    const result: any = { type: 'boolean' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    const inner = zodToJsonSchema(schema._def.innerType);
    inner.default = schema._def.defaultValue();
    return inner;
  }

  // Fallback
  return { type: 'string' };
}

// Tool definitions
const tools = [
  // Session management
  {
    name: 'demosmith_start',
    description: 'Start a new demo recording session. Opens a browser and navigates to the starting URL.',
    inputSchema: zodToJsonSchema(startInputSchema),
    handler: start,
    zodSchema: startInputSchema,
  },
  {
    name: 'demosmith_end',
    description: 'End the current demo session. Closes the browser and generates all deliverables (video, guide, screenshots).',
    inputSchema: zodToJsonSchema(endInputSchema),
    handler: end,
    zodSchema: endInputSchema,
  },
  {
    name: 'demosmith_status',
    description: 'Get the status of the current demo session, including progress and step count.',
    inputSchema: zodToJsonSchema(statusInputSchema),
    handler: status,
    zodSchema: statusInputSchema,
  },

  // Navigation
  {
    name: 'demosmith_navigate',
    description: 'Navigate to a URL. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(navigateInputSchema),
    handler: navigate,
    zodSchema: navigateInputSchema,
  },
  {
    name: 'demosmith_snapshot',
    description: 'Get an accessibility tree snapshot of the current page. Use this to find element refs for click/fill/select actions.',
    inputSchema: zodToJsonSchema(snapshotInputSchema),
    handler: snapshot,
    zodSchema: snapshotInputSchema,
  },

  // Core actions
  {
    name: 'demosmith_click',
    description: 'Click an element. Supports ref from snapshot (e.g., "1"), text matching (e.g., "text:Submit"), or other selectors.',
    inputSchema: zodToJsonSchema(clickInputSchema),
    handler: click,
    zodSchema: clickInputSchema,
  },
  {
    name: 'demosmith_fill',
    description: 'Fill a text input. Supports ref from snapshot or text-based selectors like "label:Email" or "placeholder:Enter name".',
    inputSchema: zodToJsonSchema(fillInputSchema),
    handler: fill,
    zodSchema: fillInputSchema,
  },
  {
    name: 'demosmith_select',
    description: 'Select an option from a dropdown by ref (from snapshot). Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(selectInputSchema),
    handler: select,
    zodSchema: selectInputSchema,
  },
  {
    name: 'demosmith_press_key',
    description: 'Press a key or key combination (e.g., "Enter", "Tab", "Control+A"). Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(pressKeyInputSchema),
    handler: pressKey,
    zodSchema: pressKeyInputSchema,
  },
  {
    name: 'demosmith_hover',
    description: 'Hover over an element to trigger tooltips or dropdown menus. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(hoverInputSchema),
    handler: hover,
    zodSchema: hoverInputSchema,
  },
  {
    name: 'demosmith_drag',
    description: 'Drag an element from one location to another. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(dragInputSchema),
    handler: drag,
    zodSchema: dragInputSchema,
  },
  {
    name: 'demosmith_upload',
    description: 'Upload a file to a file input element. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(uploadInputSchema),
    handler: upload,
    zodSchema: uploadInputSchema,
  },

  // Page actions
  {
    name: 'demosmith_scroll',
    description: 'Scroll the page or scroll an element into view. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(scrollInputSchema),
    handler: scroll,
    zodSchema: scrollInputSchema,
  },
  {
    name: 'demosmith_wait',
    description: 'Wait for a page load condition. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(waitInputSchema),
    handler: wait,
    zodSchema: waitInputSchema,
  },
  {
    name: 'demosmith_screenshot',
    description: 'Take a manual screenshot. Records this as a step in the demo.',
    inputSchema: zodToJsonSchema(screenshotInputSchema),
    handler: screenshot,
    zodSchema: screenshotInputSchema,
  },

  // Verification
  {
    name: 'demosmith_assert',
    description: 'Verify a condition (text, visibility, URL, value, etc.). Records the result as a step in the demo.',
    inputSchema: zodToJsonSchema(assertInputSchema),
    handler: assert,
    zodSchema: assertInputSchema,
  },

  // Tab management
  {
    name: 'demosmith_new_tab',
    description: 'Open a new browser tab, optionally navigating to a URL.',
    inputSchema: zodToJsonSchema(newTabInputSchema),
    handler: newTabTool,
    zodSchema: newTabInputSchema,
  },
  {
    name: 'demosmith_switch_tab',
    description: 'Switch to a different browser tab by its page ID.',
    inputSchema: zodToJsonSchema(switchTabInputSchema),
    handler: switchTabTool,
    zodSchema: switchTabInputSchema,
  },
  {
    name: 'demosmith_close_tab',
    description: 'Close a browser tab by its page ID.',
    inputSchema: zodToJsonSchema(closeTabInputSchema),
    handler: closeTabTool,
    zodSchema: closeTabInputSchema,
  },
  {
    name: 'demosmith_list_tabs',
    description: 'List all open browser tabs with their URLs and titles.',
    inputSchema: zodToJsonSchema(listTabsInputSchema),
    handler: listTabsTool,
    zodSchema: listTabsInputSchema,
  },
];

// Create server
const server = new Server(
  { name: 'demosmith', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools.find(t => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  try {
    // Validate input
    const validatedInput = tool.zodSchema.parse(args ?? {});

    // Execute tool
    const result = await (tool.handler as (input: any) => Promise<any>)(validatedInput);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }) }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('demosmith-mcp server started');
}

main().catch(console.error);
