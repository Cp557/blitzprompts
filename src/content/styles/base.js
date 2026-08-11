const interVariableFontUrl = chrome.runtime.getURL('fonts/inter-latin-wght-normal.woff2')

export const existingStyles = `
  @font-face {
    font-family: "BlitzPrompts Inter";
    font-style: normal;
    font-display: swap;
    font-weight: 100 900;
    src: url("${interVariableFontUrl}") format("woff2-variations");
  }

  /* Base font reset for consistent styling across all sites */
  .prompts-panel,
  .prompts-panel *,
  .panel-overlay,
  .blitz-placeholder-modal,
  .blitz-placeholder-modal *,
  .blitz-placeholder-container,
  .blitz-placeholder-container *,
  .modal-overlay,
  .modal-overlay *,
  .modal,
  .modal *,
  .delete-confirmation,
  .delete-confirmation *,
  .blitz-settings-dialog,
  .blitz-settings-dialog *,
  .blitz-confirmation-dialog,
  .blitz-confirmation-dialog *,
  .toast,
  .toast * {
    font-family: "BlitzPrompts Inter", sans-serif !important;
    font-weight: 400 !important;
    letter-spacing: normal !important;
  }

  .prompts-panel {
    position: fixed;
    right: -350px;
    top: 0;
    width: 350px;
    height: 100vh;
    background: white;
    border-left: 1px solid #e5e7eb;
    z-index: 999;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
  }

  .prompts-panel.open { right: 0; }

  .panel-header {
    flex-shrink: 0;
    position: relative;
    background: #f0f9ff;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
  }

  .panel-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 36px;
  }

  .panel-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .panel-header-subview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 36px;
    min-height: 36px;
  }

  .panel-header h2 {
    font-size: 24px;
    font-weight: 600 !important;
    color: #1e40af;
    margin-bottom: 16px;
  }

  .search-container {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    height: 36px;
  }

  .search-input {
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    padding: 8px 12px 8px 36px;
    border: 2px solid #bfdbfe;
    border-radius: 8px;
    font-size: 14px !important;
    line-height: 20px;
    background: white;
    color: #1e40af;
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: none !important;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: #3b82f6;
    display: block;
    pointer-events: none;
  }

  .prompts-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-bottom: 84px; /* 24px (bottom position) + 56px (button height) + 4px (extra space) */
  }

  .prompt-card .number-marker {
    color: #3b82f6;
    font-weight: 600 !important;
    margin-right: 4px;
  }

  .prompt-card .input-tag {
    padding: 0 4px;
    margin: 0;
    display: inline;
    background: none;
    color: #3b82f6;
    font-weight: 600 !important;
  }

  .back-button {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #3b82f6;
    display: flex;
    align-items: center;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .back-button:hover {
    background: #eff6ff;
  }

  .add-button {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: #3b82f6;
    border: none;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 1); /* Solid shadow with no transparency */
    z-index: 9999; /* High z-index to ensure it's above other elements */
  }

  .add-button:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(59, 130, 246, 1); /* Solid shadow with no transparency */
  }

  .add-prompt-form {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .add-prompt-form textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    border: 2px solid #bfdbfe;
    border-radius: 8px;
    margin: 12px 0 16px;
    font-size: 14px;
    resize: vertical;
    transition: all 0.2s ease;
    background: white;
    color: #1e293b;
  }

  .add-prompt-form textarea:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: none !important;
  }

  .toast {
    position: absolute;
    bottom: 24px;
    left: 12px;
    right: 12px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 2147483647;
    animation: slideIn 0.3s ease;
    box-sizing: border-box;
  }

  .toast.success { border-left: 4px solid #10b981; }
  .toast.error { border-left: 4px solid #ef4444; background: #ef4444; color: white; }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .panel-overlay {
    position: fixed;
    right: 0;
    top: 0;
    width: 350px;
    height: 100vh;
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 998;
  }

  .panel-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .prompt-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .prompt-card p {
    color: #1e293b;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin-top: 8px;
    padding-left: 0; /* remove extra left offset */
  }

  .prompt-card:hover {
    border-color: #1e40af;
    box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.1);
    transform: translateY(-2px);
  }

  .prompt-title {
    font-size: 14px;
    font-weight: 600 !important;
    color: #1e40af;
    margin: 0 0 3px 0;
  }

  .input-tag {
    background: #f0f9ff;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500 !important;
    font-size: 13px;
    display: inline-block;
    margin: 0 2px;
  }

  .toolbar-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: white;
    border: 1px solid #e5e7eb;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toolbar-btn:hover {
    background: #f0f9ff;
    border-color: #3b82f6;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.15);
  }

  .toolbar-btn:active {
    transform: translateY(0);
  }

  .toolbar-btn svg {
    width: 100%;
    height: 100%;
  }

  .panel-header .close-button {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
  }

  .close-button {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .close-button:hover {
    background: #e5e7eb;
    color: #1e40af;
  }

  .close-button svg {
    width: 20px;
    height: 20px;
  }

`
