// BlitzPrompts Chrome Extension - Content Script Entry Point
// 
// This file serves as the entry point for the content script.
// It initializes the extension panel.
// 
// Note: This is bundled as IIFE, so no exports are available externally.

import { PromptPanelExtended } from './panel/PromptPanelExtended.js'

// Initialization guards to prevent double-initialization
let isInitializing = false;
let isInitialized = false;
let initRetryCount = 0;
const MAX_INIT_RETRIES = 5;
const INIT_RETRY_DELAY = 1500;

// Schedule a retry if initialization failed
function scheduleRetry() {
  if (initRetryCount < MAX_INIT_RETRIES) {
    initRetryCount++;
    console.log(`[Extension] Retrying initialization (${initRetryCount}/${MAX_INIT_RETRIES})...`);
    setTimeout(initPinnedPrompts, INIT_RETRY_DELAY);
  }
}

// Main initialization function
const initPinnedPrompts = async () => {
  // Prevent double-initialization
  if (isInitializing || isInitialized) {
    return;
  }
  isInitializing = true;

  try {
    const app = new PromptPanelExtended();
    const success = await app.init();

    if (success) {
      isInitialized = true;
    } else {
      // init() returned false, usually because the page DOM was not ready yet.
      isInitializing = false;
      scheduleRetry();
      return;
    }
  } catch (error) {
    console.error("[Extension] Error initializing:", error);
    isInitializing = false;
    scheduleRetry();
    return;
  } finally {
    isInitializing = false;
  }
};

// Expose initialization function globally
window.initPinnedPrompts = initPinnedPrompts;

// Add global styles for delete button and primary button
if (!document.getElementById('blitz-global-btn-styles')) {
  const style = document.createElement('style');
  style.id = 'blitz-global-btn-styles';
  style.textContent = `
    .btn-delete {
      background: #ef4444 !important;
      color: #fff !important;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 8px;
    }
    .btn-delete:hover {
      background: #dc2626 !important;
    }
    .btn-primary {
      background: #3b82f6 !important;
      color: #fff !important;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      background: #2563eb !important;
    }
    .btn-primary:disabled {
      background: #93c5fd !important;
      cursor: not-allowed;
      box-shadow: none;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      transition: transform 0.3s ease;
    }
    .toast.success {
      background: #10b981;
    }
    .toast.error {
      background: #ef4444;
    }
  `;
  document.head.appendChild(style);
}

// Auto-initialize when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure page is fully loaded
    setTimeout(initPinnedPrompts, 500);
  });
} else {
  // DOM is already ready
  setTimeout(initPinnedPrompts, 500);
}
