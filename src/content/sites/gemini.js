// Gemini Site Adapter
// Handles header injection for gemini.google.com

import { BaseSiteAdapter } from './base-adapter.js'
import { getLogoSvg } from '../constants/icons.js'

/**
 * Gemini-specific adapter for header icon injection
 * 
 * Gemini's header structure (Angular-based):
 * - <top-bar-actions> component with .top-bar-actions div
 * - Inside: .left-section, .center-section, .right-section
 * - Right section contains .buttons-container divs with action buttons
 * 
 * The icon is injected at the START of .right-section (left of other buttons)
 */
export class GeminiAdapter extends BaseSiteAdapter {
  constructor(panelInstance) {
    super(panelInstance)
  }

  static getSiteName() {
    return 'Gemini'
  }

  /**
   * Create Gemini-styled header icon
   * Matches Google Material Design button styling
   */
  createHeaderIcon() {
    const wrapper = document.createElement("div")
    wrapper.className = "blitz-header-icon-wrapper buttons-container"
    wrapper.setAttribute("data-state", "closed")
    
    const button = document.createElement("button")
    // Use Gemini's Material Design icon button classes
    button.className = "blitz-header-btn mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-unthemed"
    button.setAttribute("aria-label", "Open BlitzPrompts")
    button.setAttribute("type", "button")
    button.innerHTML = `<span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span><div class="blitz-header-icon">${getLogoSvg()}</div><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span>`
    
    wrapper.appendChild(button)
    return wrapper
  }

  /**
   * Inject icon into Gemini's header bar
   * Targets the right-section of top-bar-actions
   */
  injectHeaderIcon() {
    // Remove any existing injected icons first
    document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())
    
    let injectedSuccessfully = false
    const clickHandler = this.getIconClickHandler()
    
    // Primary injection: Find the right-section in top-bar-actions
    const rightSection = document.querySelector('.top-bar-actions .right-section')
    if (rightSection) {
      const headerIcon = this.createHeaderIcon()
      headerIcon.querySelector('button').addEventListener('click', clickHandler)
      // Insert at the beginning of right-section (left of other buttons)
      rightSection.insertBefore(headerIcon, rightSection.firstChild)
      injectedSuccessfully = true
    }
    
    // Fallback: Try the top-bar-actions element directly if class selector fails
    if (!injectedSuccessfully) {
      const topBarActions = document.querySelector('top-bar-actions .right-section')
      if (topBarActions) {
        const headerIcon = this.createHeaderIcon()
        headerIcon.querySelector('button').addEventListener('click', clickHandler)
        topBarActions.insertBefore(headerIcon, topBarActions.firstChild)
        injectedSuccessfully = true
      }
    }
    
    return injectedSuccessfully
  }

  /**
   * Check if Gemini header needs re-injection
   * Called by MutationObserver when DOM changes
   */
  needsReinjection() {
    // Check both possible selectors
    const rightSection = document.querySelector('.top-bar-actions .right-section') || 
                         document.querySelector('top-bar-actions .right-section')
    
    const hasIcon = rightSection?.querySelector('.blitz-header-icon-wrapper')
    
    // Re-inject if container exists but icon is missing
    return rightSection && !hasIcon
  }

  /**
   * Collect recent messages from Gemini chat DOM.
   * Returns newest-last array of { role, parts: [{type:'text', value}] }.
   */
  getRecentMessages(limit = 30) {
    const root =
      document.querySelector('#chat-history .chat-history') ||
      document.querySelector('#chat-history') ||
      document.querySelector('infinite-scroller.chat-history') ||
      document.querySelector('.chat-history')

    if (!root) return []

    const turns =
      Array.from(root.querySelectorAll('.conversation-container')) ||
      []

    const userSelectors = [
      '.user-query .query-text',
      '.user-query .query-text-line',
      'user-query .query-content',
      '.user-query-bubble-with-background',
    ]

    const assistantSelectors = [
      'model-response message-content',
      'model-response .model-response-text',
      'model-response .markdown',
      'model-response .response-content',
      'model-response',
    ]

    const extractFirstMatch = (node, selectors) => {
      for (const selector of selectors) {
        const matches = Array.from(node.querySelectorAll(selector))
        const text = matches
          .map((el) => (el.innerText || '').trim())
          .filter(Boolean)
          .join('\n\n')
          .replace(/\s+\n/g, '\n')
          .trim()
        if (text) return text
      }
      return ''
    }

    const messages = []

    if (turns.length) {
      turns.forEach((turn) => {
        const userText = extractFirstMatch(turn, userSelectors)
        if (userText) {
          messages.push({ role: 'user', parts: [{ type: 'text', value: userText }] })
        }

        const assistantText = extractFirstMatch(turn, assistantSelectors)
        if (assistantText) {
          messages.push({ role: 'assistant', parts: [{ type: 'text', value: assistantText }] })
        }
      })
    } else {
      const looseNodes = Array.from(root.querySelectorAll('user-query, model-response'))
      looseNodes.forEach((node) => {
        const isUser = node.tagName?.toLowerCase().includes('user-query')
        const text = extractFirstMatch(node, isUser ? userSelectors : assistantSelectors)
        if (!text) return
        messages.push({
          role: isUser ? 'user' : 'assistant',
          parts: [{ type: 'text', value: text }],
        })
      })
    }

    return messages.slice(-limit)
  }

  /**
   * Group recent messages by role for context preview (last N user/assistant).
   */
  getRecentContext(opts = {}) {
    const userCount = Number.isFinite(opts.userCount) ? opts.userCount : 3
    const assistantCount = Number.isFinite(opts.assistantCount) ? opts.assistantCount : 3
    const messages = this.getRecentMessages(6)
    const buckets = { user: [], assistant: [] }

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (!msg?.role) continue
      const bucket = buckets[msg.role]
      if (!bucket) continue
      const target = msg.role === 'user' ? userCount : assistantCount
      if (bucket.length < target) bucket.push(msg)
      if (buckets.user.length >= userCount && buckets.assistant.length >= assistantCount) break
    }

    return {
      user: buckets.user.reverse(),
      assistant: buckets.assistant.reverse(),
      all: messages,
    }
  }

  /**
   * Gemini-specific styles
   * Matches Google Material Design system
   */
  static getStyles() {
    return `
      /* Gemini Font Override - ensure consistent fonts with other sites */
      .prompts-panel,
      .prompts-panel *,
      .blitz-placeholder-modal,
      .blitz-placeholder-modal *,
      .blitz-placeholder-container,
      .blitz-placeholder-container *,
      .modal-overlay,
      .modal-overlay *,
      .modal,
      .modal *,
      .delete-confirmation,
      .delete-confirmation * {
        font-family: "BlitzPrompts Inter", sans-serif !important;
        letter-spacing: normal !important;
      }

      .prompts-panel .panel-header h2 {
        font-size: 24px !important;
        font-weight: 600 !important;
      }

      .prompts-panel .prompt-title {
        font-size: 14px !important;
        font-weight: 600 !important;
      }

      .prompts-panel .prompt-card p {
        font-size: 14px !important;
        line-height: 1.6 !important;
      }

      .prompts-panel .search-input {
        font-size: 14px !important;
      }

      /* Clamp inputs without widening the panel (Gemini-specific) */
      .prompts-panel {
        --bp-panel-width: 350px;
        width: var(--bp-panel-width) !important;
        right: calc(-1 * var(--bp-panel-width)) !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .prompts-panel.open {
        right: 0 !important;
      }
      .prompts-panel .panel-header,
      .prompts-panel .prompts-container,
      .prompts-panel .form-group {
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .prompts-panel input,
      .prompts-panel textarea,
      .prompts-panel select {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      /* Modal input clamps (Gemini) */
      .modal {
        width: min(620px, calc(100vw - 32px)) !important;
        max-width: 620px !important;
        box-sizing: border-box !important;
      }
      .modal .modal-content,
      .modal .form-group {
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .modal input,
      .modal textarea,
      .modal select {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      /* Gemini Header Icon Styles */
      .blitz-header-icon-wrapper {
        display: inline-flex;
        align-items: center;
        margin-right: 4px;
      }

      /* Override for Gemini's buttons-container */
      .blitz-header-icon-wrapper.buttons-container {
        display: flex;
        align-items: center;
      }

      .blitz-header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.2s ease;
        padding: 0;
        position: relative;
      }

      .blitz-header-btn:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }

      .blitz-header-btn:active {
        background-color: rgba(0, 0, 0, 0.12);
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .blitz-header-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }
        .blitz-header-btn:active {
          background-color: rgba(255, 255, 255, 0.12);
        }
      }

      .blitz-header-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .blitz-header-icon svg {
        width: 100%;
        height: 100%;
      }

      .blitz-header-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /* Material Design ripple effect placeholder */
      .blitz-header-btn .mat-mdc-button-persistent-ripple {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: inherit;
        pointer-events: none;
      }

      .blitz-header-btn .mat-focus-indicator {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: inherit;
        pointer-events: none;
      }

      .blitz-header-btn .mat-mdc-button-touch-target {
        position: absolute;
        top: 50%;
        left: 50%;
        height: 48px;
        width: 48px;
        transform: translate(-50%, -50%);
      }
    `
  }
}
