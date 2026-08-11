export const collapsiblePromptStyles = `
  .prompt-card {
    position: relative;
    transition: all 0.2s ease;
  }

  .prompt-card .prompt-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block !important;
    margin-bottom: 0 !important;
    max-width: 100%;
  }
  
  /* Add a placeholder when no title is available */
  .prompt-card .prompt-title.no-title {
    color: #9ca3af;
    font-style: italic;
  }
`



