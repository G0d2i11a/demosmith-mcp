import type { Page, Locator } from 'playwright';

// Map to store ref -> node info for the current snapshot
const refMap = new Map<string, { role: string; name?: string }>();

/**
 * Get accessibility snapshot via page evaluation (fallback method)
 */
async function getAccessibilityViaEval(page: Page): Promise<any> {
  // Simple fallback - get basic page structure
  return page.evaluate(() => {
    function buildTree(element: Element): any {
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      const name = element.getAttribute('aria-label')
        || (element as HTMLInputElement).placeholder
        || element.textContent?.trim().slice(0, 50)
        || '';

      const node: any = { role, name };

      if ((element as HTMLInputElement).value) {
        node.value = (element as HTMLInputElement).value;
      }
      if ((element as HTMLInputElement).checked !== undefined) {
        node.checked = (element as HTMLInputElement).checked;
      }
      if ((element as HTMLInputElement).disabled) {
        node.disabled = true;
      }

      const children: any[] = [];
      for (const child of element.children) {
        const childNode = buildTree(child);
        if (childNode) children.push(childNode);
      }
      if (children.length > 0) {
        node.children = children;
      }

      return node;
    }

    return buildTree(document.body);
  });
}

/**
 * Get accessibility tree snapshot in a format similar to Chrome DevTools MCP
 */
export async function getAccessibilitySnapshot(page: Page): Promise<string> {
  refMap.clear();

  // Try Playwright's accessibility API first, fallback to eval
  let snapshot: any;
  try {
    snapshot = await (page as any).accessibility?.snapshot?.();
  } catch {
    // Ignore
  }

  if (!snapshot) {
    snapshot = await getAccessibilityViaEval(page);
  }

  if (!snapshot) {
    return 'Page has no accessible content';
  }

  let refCounter = 0;
  const lines: string[] = [];

  function processNode(node: any, indent: number = 0): void {
    const ref = String(++refCounter);
    const prefix = '  '.repeat(indent);

    // Build the line
    let line = `${prefix}[${ref}] ${node.role}`;

    if (node.name) {
      line += ` "${node.name}"`;
    }

    if (node.value !== undefined && node.value !== '') {
      line += ` value="${node.value}"`;
    }

    if (node.checked !== undefined) {
      line += ` checked=${node.checked}`;
    }

    if (node.disabled) {
      line += ` disabled`;
    }

    if (node.focused) {
      line += ` focused`;
    }

    lines.push(line);

    // Store ref mapping
    refMap.set(ref, { role: node.role, name: node.name });

    // Process children
    if (node.children) {
      for (const child of node.children) {
        processNode(child, indent + 1);
      }
    }
  }

  processNode(snapshot);
  return lines.join('\n');
}

/**
 * Get a Playwright locator from a ref
 */
export function getLocatorFromRef(page: Page, ref: string) {
  const info = refMap.get(ref);
  if (!info) {
    throw new Error(`Unknown ref: ${ref}. Please take a new snapshot.`);
  }

  if (info.role) {
    const options: any = {};
    if (info.name) {
      options.name = info.name;
    }
    return page.getByRole(info.role as any, options);
  }

  throw new Error(`Cannot create locator for ref: ${ref}`);
}

/**
 * Find element by ref - re-snapshots and locates the element
 */
export async function findElementByRef(page: Page, ref: string) {
  // First check if we have it cached
  const cached = refMap.get(ref);
  if (cached && cached.role) {
    const options: any = {};
    if (cached.name) {
      options.name = cached.name;
    }
    return page.getByRole(cached.role as any, options);
  }

  // Re-snapshot to find the element
  await getAccessibilitySnapshot(page);

  const info = refMap.get(ref);
  if (!info) {
    throw new Error(`Element with ref ${ref} not found. The page may have changed - please take a new snapshot.`);
  }

  const options: any = {};
  if (info.name) {
    options.name = info.name;
  }

  return page.getByRole(info.role as any, options);
}

/**
 * Enhanced element locator supporting multiple strategies
 *
 * Supported formats:
 * - "1", "2", etc. - ref from snapshot
 * - "text:Submit" - find by visible text
 * - "text:/Submit|Cancel/" - find by text regex
 * - "label:Email" - find by label text
 * - "placeholder:Enter email" - find by placeholder
 * - "role:button:Submit" - find by role and name
 * - "testid:submit-btn" - find by data-testid
 * - "css:.btn-primary" - find by CSS selector
 * - "xpath://button[@type='submit']" - find by XPath
 */
export async function findElement(page: Page, selector: string): Promise<Locator> {
  // Check if it's a simple ref number
  if (/^\d+$/.test(selector)) {
    return findElementByRef(page, selector);
  }

  // Parse selector type
  const colonIndex = selector.indexOf(':');
  if (colonIndex === -1) {
    // Default to text search if no prefix
    return page.getByText(selector);
  }

  const type = selector.slice(0, colonIndex).toLowerCase();
  const value = selector.slice(colonIndex + 1);

  switch (type) {
    case 'text': {
      // Check if it's a regex pattern
      if (value.startsWith('/') && value.endsWith('/')) {
        const pattern = value.slice(1, -1);
        return page.getByText(new RegExp(pattern));
      }
      return page.getByText(value);
    }

    case 'label': {
      return page.getByLabel(value);
    }

    case 'placeholder': {
      return page.getByPlaceholder(value);
    }

    case 'role': {
      // Format: role:button:Submit or role:button
      const parts = value.split(':');
      const role = parts[0];
      const name = parts[1];
      if (name) {
        return page.getByRole(role as any, { name });
      }
      return page.getByRole(role as any);
    }

    case 'testid': {
      return page.getByTestId(value);
    }

    case 'css': {
      return page.locator(value);
    }

    case 'xpath': {
      return page.locator(`xpath=${value}`);
    }

    case 'alt': {
      return page.getByAltText(value);
    }

    case 'title': {
      return page.getByTitle(value);
    }

    default: {
      // Unknown type, try as text
      return page.getByText(selector);
    }
  }
}

/**
 * Get element by ref for tools that need ElementHandle
 */
export async function getElementByRef(page: Page, ref: string) {
  const locator = await findElement(page, ref);
  return locator.first();
}
