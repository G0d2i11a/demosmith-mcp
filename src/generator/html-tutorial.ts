import * as path from 'path';
import type { DemoSession, DemoStep } from '../types.js';

/**
 * Generate an interactive HTML tutorial
 */
export function generateHtmlTutorial(session: DemoSession): string {
  const steps = session.steps.filter(s => s.evidence.screenshotPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)} - Interactive Tutorial</title>
  <style>
    :root {
      --primary: #4361ee;
      --primary-dark: #3a56d4;
      --bg: #0f0f1a;
      --bg-card: #1a1a2e;
      --bg-hover: #252542;
      --text: #e8e8e8;
      --text-muted: #888;
      --border: #333;
      --success: #10b981;
      --shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #4361ee, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .progress-bar {
      background: var(--bg-card);
      border-radius: 10px;
      height: 8px;
      margin: 30px 0;
      overflow: hidden;
    }

    .progress-fill {
      background: linear-gradient(90deg, var(--primary), #7c3aed);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    .main-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 30px;
    }

    @media (max-width: 900px) {
      .main-content {
        grid-template-columns: 1fr;
      }
    }

    /* Sidebar */
    .sidebar {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 20px;
      height: fit-content;
      position: sticky;
      top: 20px;
    }

    .sidebar h2 {
      font-size: 1rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }

    .step-list {
      list-style: none;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 5px;
    }

    .step-item:hover {
      background: var(--bg-hover);
    }

    .step-item.active {
      background: var(--primary);
    }

    .step-item.completed .step-number {
      background: var(--success);
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-item.active .step-number {
      background: white;
      color: var(--primary);
    }

    .step-title {
      font-size: 0.9rem;
      line-height: 1.4;
    }

    /* Main viewer */
    .viewer {
      background: var(--bg-card);
      border-radius: 12px;
      overflow: hidden;
    }

    .viewer-header {
      padding: 20px 25px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .viewer-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .viewer-badge {
      background: var(--primary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .viewer-image {
      position: relative;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    .viewer-image img {
      max-width: 100%;
      max-height: 600px;
      object-fit: contain;
    }

    .viewer-description {
      padding: 25px;
      border-top: 1px solid var(--border);
    }

    .viewer-description p {
      font-size: 1.1rem;
      color: var(--text);
      margin-bottom: 15px;
    }

    .viewer-meta {
      display: flex;
      gap: 20px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .viewer-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Navigation */
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      padding: 20px 25px;
      border-top: 1px solid var(--border);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn.prev {
      background: var(--bg-hover);
      color: var(--text);
    }

    .nav-btn.next {
      background: var(--primary);
      color: white;
    }

    .nav-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Completion */
    .completion {
      text-align: center;
      padding: 60px 20px;
    }

    .completion-icon {
      width: 80px;
      height: 80px;
      background: var(--success);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 2.5rem;
    }

    .completion h2 {
      font-size: 1.8rem;
      margin-bottom: 10px;
    }

    .completion p {
      color: var(--text-muted);
      margin-bottom: 30px;
    }

    .restart-btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .restart-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
    }

    /* Keyboard hint */
    .keyboard-hint {
      text-align: center;
      margin-top: 30px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    kbd {
      background: var(--bg-card);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      font-family: inherit;
      margin: 0 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(session.title)}</h1>
      <p class="subtitle">Interactive step-by-step tutorial</p>
    </header>

    <div class="progress-bar">
      <div class="progress-fill" id="progress"></div>
    </div>

    <div class="main-content">
      <aside class="sidebar">
        <h2>Steps</h2>
        <ul class="step-list" id="stepList">
          ${steps.map((step, i) => `
            <li class="step-item${i === 0 ? ' active' : ''}" data-step="${i}">
              <span class="step-number">${i + 1}</span>
              <span class="step-title">${escapeHtml(truncate(step.description, 50))}</span>
            </li>
          `).join('')}
        </ul>
      </aside>

      <main class="viewer" id="viewer">
        <div class="viewer-header">
          <span class="viewer-title" id="viewerTitle">Step 1</span>
          <span class="viewer-badge" id="viewerAction">${steps[0]?.action || ''}</span>
        </div>
        <div class="viewer-image">
          <img id="viewerImage" src="assets/${path.basename(steps[0]?.evidence.screenshotPath || '')}" alt="Step screenshot">
        </div>
        <div class="viewer-description">
          <p id="viewerDescription">${escapeHtml(steps[0]?.description || '')}</p>
          <div class="viewer-meta">
            <span>⏱ <span id="viewerDuration">${steps[0]?.duration || 0}ms</span></span>
            <span>🎯 Action: <span id="viewerActionDetail">${steps[0]?.action || ''}</span></span>
          </div>
        </div>
        <div class="nav-buttons">
          <button class="nav-btn prev" id="prevBtn" disabled>← Previous</button>
          <button class="nav-btn next" id="nextBtn">Next →</button>
        </div>
      </main>
    </div>

    <p class="keyboard-hint">
      Use <kbd>←</kbd> <kbd>→</kbd> arrow keys to navigate, <kbd>Space</kbd> to advance
    </p>
  </div>

  <script>
    const steps = ${JSON.stringify(steps.map(s => ({
      description: s.description,
      action: s.action,
      duration: s.duration,
      screenshot: 'assets/' + path.basename(s.evidence.screenshotPath || ''),
      details: s.details,
    })))};

    let currentStep = 0;
    const totalSteps = steps.length;

    const elements = {
      progress: document.getElementById('progress'),
      stepList: document.getElementById('stepList'),
      viewer: document.getElementById('viewer'),
      viewerTitle: document.getElementById('viewerTitle'),
      viewerAction: document.getElementById('viewerAction'),
      viewerImage: document.getElementById('viewerImage'),
      viewerDescription: document.getElementById('viewerDescription'),
      viewerDuration: document.getElementById('viewerDuration'),
      viewerActionDetail: document.getElementById('viewerActionDetail'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
    };

    function updateView() {
      const step = steps[currentStep];

      // Update progress
      elements.progress.style.width = ((currentStep + 1) / totalSteps * 100) + '%';

      // Update sidebar
      document.querySelectorAll('.step-item').forEach((item, i) => {
        item.classList.remove('active');
        if (i < currentStep) item.classList.add('completed');
        if (i === currentStep) item.classList.add('active');
      });

      // Update viewer
      elements.viewerTitle.textContent = 'Step ' + (currentStep + 1);
      elements.viewerAction.textContent = step.action;
      elements.viewerImage.src = step.screenshot;
      elements.viewerDescription.textContent = step.description;
      elements.viewerDuration.textContent = step.duration + 'ms';
      elements.viewerActionDetail.textContent = step.action;

      // Update buttons
      elements.prevBtn.disabled = currentStep === 0;
      elements.nextBtn.textContent = currentStep === totalSteps - 1 ? 'Complete ✓' : 'Next →';
    }

    function goToStep(index) {
      if (index >= 0 && index < totalSteps) {
        currentStep = index;
        updateView();
      } else if (index >= totalSteps) {
        showCompletion();
      }
    }

    function showCompletion() {
      elements.viewer.innerHTML = \`
        <div class="completion">
          <div class="completion-icon">✓</div>
          <h2>Tutorial Complete!</h2>
          <p>You've successfully completed all \${totalSteps} steps.</p>
          <button class="restart-btn" onclick="restart()">Start Over</button>
        </div>
      \`;
      elements.progress.style.width = '100%';
    }

    function restart() {
      location.reload();
    }

    // Event listeners
    elements.prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
    elements.nextBtn.addEventListener('click', () => goToStep(currentStep + 1));

    document.querySelectorAll('.step-item').forEach(item => {
      item.addEventListener('click', () => {
        goToStep(parseInt(item.dataset.step));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goToStep(currentStep - 1);
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToStep(currentStep + 1);
      }
    });

    // Initialize
    updateView();
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
