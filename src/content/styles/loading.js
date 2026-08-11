export const loadingStyles = `
  /* Loading animation */
  .loading-spinner {
    display: inline-block;
    width: 30px;
    height: 30px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s ease-in-out infinite;
    margin: 0 auto 16px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

export const startupLoaderStyles = `
  .extension-loading {
    position: fixed;
    right: 16px;
    top: 72px;
    width: 40px;
    height: 40px;
    background: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,.1);
  }
  .extension-loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(59,130,246,.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
`



