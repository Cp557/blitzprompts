export const forceLightTheme = `
  .prompts-panel,
  .blitz-placeholder-container,
  .modal {
    color-scheme: light !important;
    background: #fff !important;
    color: #1e293b !important;
  }
  .panel-overlay,
  .blitz-placeholder-modal,
  .modal-overlay {
    color-scheme: light !important;
    color: #1e293b !important;
    /* Do NOT set background here, let original CSS handle transparency */
  }
  /* Force light theme on all inputs and textareas */
  .prompts-panel input,
  .prompts-panel textarea,
  .modal input,
  .modal textarea,
  .blitz-placeholder-modal input,
  .blitz-placeholder-modal textarea {
    color-scheme: light !important;
    background: white !important;
    color: #1e293b !important;
  }
`


