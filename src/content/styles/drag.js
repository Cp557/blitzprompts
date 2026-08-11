export const dragStyles = `
  .prompt-card {
    user-select: none;
    position: relative;
    margin-bottom: 8px;
    padding-left: 16px !important; 
  }

  .prompt-card.dragging {
    opacity: 0.5;
    background: #f8fafc;
    border: 2px dashed #3b82f6;
  }

  .prompt-card .drag-handle {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .prompt-card:hover .drag-handle {
    opacity: 1;
  }

  .drag-handle .dot {
    width: 4px;
    height: 4px;
    background: #6b7280;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .prompt-card:hover .drag-handle .dot {
    background: #3b82f6;
  }

  .prompt-card .drag-handle:active {
    cursor: grabbing;
  }

  .drop-indicator {
    height: 0;
    margin: 0;
    border: none;
    background: #3b82f6;
    transition: all 0.15s ease;
    pointer-events: none;
  }

  .drop-indicator.active {
    height: 2px;
    margin: 4px 0;
  }

  .prompts-wrapper {
    user-select: none;
  }

  /* Fixed CSS for prompt card text */
  .prompt-card p {
    color: #1e293b;
    font-size: 14px;
    line-height: 1.6;
    margin: 0 !important;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin-top: 8px !important;
    text-indent: 0 !important;
    padding-left: 0 !important;
  }
  
  /* Ensure no first-line indentation */
  .prompt-card p::first-line {
    text-indent: 0 !important;
  }
  
  /* Reset any potential paragraph spacing */
  .prompt-card p:first-of-type {
    margin-top: 8px !important;
    text-indent: 0 !important;
  }
  
  /* Fix ProseMirror editor indentation */
  .ProseMirror p {
    text-indent: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Ensure input tags don't have extra spacing */
  .prompt-card .input-tag {
    background: #f0f9ff;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 13px;
    display: inline-block;
    margin: 0 2px;
    white-space: nowrap;
  }
`



