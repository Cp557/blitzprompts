export const placeholderStyles = `
  .blitz-placeholder-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .blitz-placeholder-modal.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .blitz-placeholder-container {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    padding: 24px;
    transform: translateY(20px);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
  }

  .blitz-placeholder-modal.visible .blitz-placeholder-container {
    transform: translateY(0);
  }

  .blitz-placeholder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .blitz-placeholder-title {
    font-size: 18px;
    font-weight: 600 !important;
    color: #1e40af;
  }

  .blitz-close-placeholder-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .blitz-close-placeholder-btn:hover {
    background: #f3f4f6;
    color: #1e40af;
  }

  .blitz-prompt-preview {
    background: #f0f9ff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #1e293b;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .blitz-prompt-preview .highlight {
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500 !important;
  }

  .blitz-placeholder-inputs {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .blitz-placeholder-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .blitz-placeholder-label {
    font-size: 14px;
    font-weight: 600 !important;
    color: #1e40af;
  }

  .blitz-placeholder-input {
    padding: 12px;
    border: 2px solid #bfdbfe;
    border-radius: 8px;
    font-size: 14px;
    width: 100%;
    min-height: 60px;
    resize: vertical;
    transition: all 0.2s ease;
    background: white;
    color: #1e293b;
    font-family: inherit;
  }

  .blitz-placeholder-input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: none !important;
  }

  .blitz-placeholder-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  .blitz-btn-cancel {
    padding: 10px 16px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500 !important;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .blitz-btn-cancel:hover {
    background: #f3f4f6;
    color: #1f2937;
  }

  .blitz-btn-apply {
    padding: 10px 16px;
    background: #3b82f6;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500 !important;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .blitz-btn-apply:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  .blitz-btn-apply:disabled {
    background: #93c5fd;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`
