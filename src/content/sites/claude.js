// Claude Site Adapter
// Handles header injection for claude.ai

import { BaseSiteAdapter } from './base-adapter.js'
import { getLogoSvg } from '../constants/icons.js'

/**
 * Claude-specific adapter for header icon injection
 * 
 * Claude's header structure:
 * - Chat actions: [data-testid="wiggle-controls-actions"]
 * - New chat actions: #dframe-header-actions-slot
 * 
 * The icon is injected to the left of the first native header action.
 */
export class ClaudeAdapter extends BaseSiteAdapter {
  constructor(panelInstance) {
    super(panelInstance)
  }

  static getSiteName() {
    return 'Claude'
  }

  /**
   * Locate the wiggle controls container on chat pages.
   * This container holds the Share button and other action controls.
   * Returns { container, shareButton } or null.
   */
  findActionsContainer() {
    // Primary: Use the wiggle-controls-actions container directly
    const container = document.querySelector('[data-testid="wiggle-controls-actions"]')
    if (container) {
      const shareButton = container.querySelector('[data-testid="wiggle-controls-actions-share"]')
      return { container, shareButton }
    }
    return null
  }

  /**
   * Locate the action group on /new from its stable slot or incognito control.
   * Claude wraps the button in tooltip elements, so return the direct child of
   * the flex container to use as the insertion reference.
   */
  findNewPageActionsContainer() {
    const dframeActions = document.querySelector('#dframe-header-actions-slot')
    const incognitoButton = dframeActions?.querySelector('button[aria-label="Use incognito"]')

    if (dframeActions) {
      let incognitoControl = incognitoButton
      while (incognitoControl?.parentElement && incognitoControl.parentElement !== dframeActions) {
        incognitoControl = incognitoControl.parentElement
      }

      return {
        container: dframeActions,
        incognitoControl: incognitoControl?.parentElement === dframeActions
          ? incognitoControl
          : dframeActions.firstElementChild
      }
    }

    const legacyIncognitoButton = document.querySelector('button[aria-label="Use incognito"]')
    if (!legacyIncognitoButton) return null

    const container =
      legacyIncognitoButton.closest('.fixed.draggable-none.flex.items-center') ||
      legacyIncognitoButton.closest('.fixed.flex.items-center')
    if (!container) return null

    let incognitoControl = legacyIncognitoButton
    while (incognitoControl.parentElement && incognitoControl.parentElement !== container) {
      incognitoControl = incognitoControl.parentElement
    }

    if (incognitoControl.parentElement !== container) return null
    return { container, incognitoControl }
  }

  /**
   * Create Claude-styled header icon
   * Matches Claude's native button styling
   */
  createHeaderIcon() {
    const wrapper = document.createElement("span")
    wrapper.className = "blitz-header-icon-wrapper"
    wrapper.setAttribute("data-state", "closed")
    
    const button = document.createElement("button")
    // Use Claude's button styling classes
    button.className = `blitz-header-btn inline-flex items-center justify-center relative shrink-0 can-focus select-none border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 w-8 rounded-md active:scale-95`
    button.setAttribute("aria-label", "Open BlitzPrompts")
    button.setAttribute("type", "button")
    button.innerHTML = `<div class="blitz-header-icon">${getLogoSvg()}</div>`
    
    wrapper.appendChild(button)
    return wrapper
  }

  /**
   * Inject icon into Claude's header bar
   * Handles multiple layouts:
   * 1. Chat page (/chat/*): Wiggle controls container with Share button
   * 2. New chat page (/new): Dframe actions slot with incognito control
   */
  injectHeaderIcon() {
    // Remove any existing injected icons first
    document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())

    let injectedSuccessfully = false
    const clickHandler = this.getIconClickHandler()
    const path = window.location?.pathname || ''
    const isChatPage = path.startsWith('/chat')
    const isNewPage = path.startsWith('/new')

    // CASE 1: Chat page - Use wiggle-controls-actions container
    if (isChatPage) {
      const actionsMatch = this.findActionsContainer()
      if (actionsMatch?.container) {
        const headerIcon = this.createHeaderIcon()
        headerIcon.querySelector('button').addEventListener('click', clickHandler)
        // Insert as first child (left of share button)
        if (actionsMatch.shareButton) {
          actionsMatch.container.insertBefore(headerIcon, actionsMatch.shareButton)
        } else {
          actionsMatch.container.insertBefore(headerIcon, actionsMatch.container.firstChild)
        }
        injectedSuccessfully = true
      }
    }

    // CASE 2: New chat page - Insert immediately left of the incognito control
    if (!injectedSuccessfully && isNewPage) {
      const actionsMatch = this.findNewPageActionsContainer()
      if (actionsMatch) {
        const headerIcon = this.createHeaderIcon()
        headerIcon.querySelector('button').addEventListener('click', clickHandler)
        actionsMatch.container.insertBefore(headerIcon, actionsMatch.incognitoControl)
        injectedSuccessfully = true
      }
    }

    return injectedSuccessfully
  }

  /**
   * Check if Claude header needs re-injection
   * Handles both chat page and new chat page layouts
   */
  needsReinjection() {
    // Check if icon already exists anywhere
    const existingIcon = document.querySelector('.blitz-header-icon-wrapper')
    if (existingIcon) {
      return false
    }

    const path = window.location?.pathname || ''
    const isChatPage = path.startsWith('/chat')
    const isNewPage = path.startsWith('/new')

    // For chat pages, only return true if the wiggle-controls container exists
    if (isChatPage) {
      const container = document.querySelector('[data-testid="wiggle-controls-actions"]')
      return !!container
    }

    if (isNewPage) {
      return !!this.findNewPageActionsContainer()
    }

    return false
  }

  /**
   * Collect recent messages from Claude chat DOM.
   * Returns newest-last array of { role, parts: [{type:'text', value}] }.
   */
  getRecentMessages(limit = 30) {
    // Try multiple selectors for the message container
    const rootSelectors = [
      'div.flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full.pt-1',
      'div.flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full',
      '[data-testid="chat-message-list"]',
      'main',
      'div.mx-auto.max-w-3xl'
    ];

    let root = null;
    for (const selector of rootSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const hasMessages = el.querySelector('div[data-test-render-count]') ||
                           el.querySelector('[data-testid="user-message"]');
        if (hasMessages) {
          root = el;
          break;
        }
      }
    }

    if (!root) {
      const messageNodes = document.querySelectorAll('div[data-test-render-count]');
      if (messageNodes.length > 0) {
        root = messageNodes[0].parentElement;
      }
    }

    if (!root) return [];

    const nodes = Array.from(root.querySelectorAll('div[data-test-render-count]'));
    if (!nodes.length) return [];

    const messages = [];

    const extractText = (el) => {
      if (!el) return '';
      return (el.innerText || '').replace(/\s+\n/g, '\n').trim();
    };

    nodes.forEach((node) => {
      const userBlock = node.querySelector('[data-testid="user-message"]');
      const assistantBlock =
        node.querySelector('.font-claude-response') || node.querySelector('.standard-markdown');

      if (userBlock) {
        const text = extractText(userBlock);
        if (text) {
          messages.push({ role: 'user', parts: [{ type: 'text', value: text }] });
        }
        return;
      }

      if (assistantBlock) {
        const text = extractText(assistantBlock);
        if (text) {
          messages.push({ role: 'assistant', parts: [{ type: 'text', value: text }] });
        }
      }
    });

    return messages.slice(-limit);
  }

  /**
   * Group recent messages by role for context preview (last N user/assistant).
   */
  getRecentContext(opts = {}) {
    const userCount = Number.isFinite(opts.userCount) ? opts.userCount : 3;
    const assistantCount = Number.isFinite(opts.assistantCount) ? opts.assistantCount : 3;
    const messages = this.getRecentMessages(6);
    const buckets = { user: [], assistant: [] };

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (!msg?.role) continue;
      const bucket = buckets[msg.role];
      if (!bucket) continue;
      const target = msg.role === 'user' ? userCount : assistantCount;
      if (bucket.length < target) bucket.push(msg);
      if (buckets.user.length >= userCount && buckets.assistant.length >= assistantCount) break;
    }

    return {
      user: buckets.user.reverse(),
      assistant: buckets.assistant.reverse(),
      all: messages,
    };
  }

  /**
   * Claude-specific styles
   * Uses Claude's design system colors and variables
   */
  static getStyles() {
    return `
      /* Claude Header Icon Styles */
      .blitz-header-icon-wrapper {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      .blitz-header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.165, 0.85, 0.45, 1);
        padding: 0;
        color: var(--text-300, #6b7280);
      }

      .blitz-header-btn:hover {
        background-color: rgba(0, 0, 0, 0.12);
        color: var(--text-100, #1f2937);
      }

      .blitz-header-btn:active {
        transform: scale(0.95);
        background-color: rgba(0, 0, 0, 0.18);
      }

      .blitz-header-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .blitz-header-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    `
  }
}
