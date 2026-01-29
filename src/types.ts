import type { Browser, BrowserContext, Page } from 'playwright';

export interface DemoSessionOptions {
  video: boolean;
  trace: boolean;
  screenshotOnStep: boolean;
  outputDir: string;
  storageState?: string;
  headless: boolean;
  viewport: { width: number; height: number };
}

export interface DemoSession {
  id: string;
  title: string;
  startUrl: string;
  startedAt: Date;
  status: 'running' | 'completed' | 'failed';
  options: DemoSessionOptions;
  steps: DemoStep[];

  // Video timing
  videoStartTime?: number; // Date.now() when video recording started

  // Playwright instances (not serializable)
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  // Multi-tab support
  pages: Map<number, Page>;
  activePageId: number;
  nextPageId: number;
}

export interface DemoStep {
  id: number;
  action: string;
  description: string;
  timestamp: Date;
  duration: number;

  // Video timing (ms from video start)
  videoStartMs?: number;
  videoEndMs?: number;

  details: {
    ref?: string;
    selector?: string;
    value?: string;
    url?: string;
    key?: string;
    fromRef?: string;
    toRef?: string;
    filePath?: string;
    fileName?: string;
    type?: string;
    expected?: string;
    actual?: string;
    message?: string;
    direction?: string;
    amount?: number;
    condition?: string;
  };

  evidence: {
    screenshotPath?: string;
    beforeSnapshot?: string;
    afterSnapshot?: string;
  };

  success: boolean;
  error?: string;
}

export interface DemoDeliverables {
  sessionId: string;
  title: string;
  outputDir: string;

  files: {
    video?: string;
    trace?: string;
    guide: string;
    steps: string;
    narration?: string;
    narrationJson?: string;
    audioFile?: string;
    videoWithAudio?: string;
    subtitleSrt?: string;
    subtitleVtt?: string;
    tutorial?: string;
    gifPreview?: string;
    assets: string[];
  };

  summary: {
    totalSteps: number;
    duration: number;
    successRate: number;
  };
}

export interface SnapshotElement {
  ref: string;
  role: string;
  name: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  children?: SnapshotElement[];
}
