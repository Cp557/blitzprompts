// Grok Site Adapter
// Handles header injection for grok.com

import { BaseSiteAdapter } from './base-adapter.js'
import { getLogoSvg } from '../constants/icons.js'

/**
 * Grok-specific adapter for header icon injection
 * 
 * Grok's header structure:
 * - Conversation header: div.absolute.end-3 (contains action buttons)
 * - Home header: action group containing the "Switch to Private Chat" link
 * 
 * The icon is injected at the beginning of the available action group
 */
export class GrokAdapter extends BaseSiteAdapter {
  constructor(panelInstance) {
    super(panelInstance)
  }

  static getSiteName() {
    return 'Grok'
  }

  /**
   * Create Grok-styled header icon
   * Matches Grok's native button styling (rounded-full, h-10 w-10)
   */
  createHeaderIcon() {
    const wrapper = document.createElement("div")
    wrapper.className = "blitz-header-icon-wrapper"
    wrapper.setAttribute("data-state", "closed")
    
    const button = document.createElement("button")
    // Use Grok's native button classes
    button.className = "blitz-header-btn inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-100 select-none hover:bg-button-ghost-hover hover:text-fg-primary border border-transparent rounded-full overflow-hidden h-10 w-10 p-2 text-fg-primary"
    button.setAttribute("aria-label", "Open BlitzPrompts")
    button.setAttribute("type", "button")
    button.innerHTML = `<div class="blitz-header-icon">${getLogoSvg()}</div>`
    
    wrapper.appendChild(button)
    return wrapper
  }

  /**
   * Find the current header action group and the element the icon should precede.
   * Grok uses different header markup on the home page and conversation pages.
   * @returns {{container: Element, before: Element|null}|null}
   */
  findHeaderTarget() {
    const conversationActions = document.querySelector('.absolute.end-3.flex.flex-row.items-center')
    if (conversationActions) {
      return { container: conversationActions, before: conversationActions.firstElementChild }
    }

    const moreButton = document.querySelector('button[aria-label="More"][aria-haspopup="menu"]')
    if (moreButton?.parentElement) {
      return { container: moreButton.parentElement, before: moreButton }
    }

    const privateChatLink = document.querySelector(
      'a[aria-label="Switch to Private Chat"], a[href="/c#private"]'
    )
    if (privateChatLink?.parentElement) {
      const privateChatItem = privateChatLink.parentElement.matches('span')
        ? privateChatLink.parentElement
        : privateChatLink
      const homeActions = privateChatItem.parentElement

      if (homeActions) {
        return { container: homeActions, before: privateChatItem }
      }
    }

    return null
  }

  /**
   * Inject icon into Grok's header bar
   * Targets the right-side action buttons container
   */
  injectHeaderIcon() {
    // Remove any existing injected icons first
    document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())
    
    const clickHandler = this.getIconClickHandler()
    const target = this.findHeaderTarget()

    if (!target) return false

    const headerIcon = this.createHeaderIcon()
    headerIcon.querySelector('button').addEventListener('click', clickHandler)
    target.container.insertBefore(headerIcon, target.before)

    return true
  }

  /**
   * Check if Grok header needs re-injection
   * Called by MutationObserver when DOM changes
   */
  needsReinjection() {
    const target = this.findHeaderTarget()
    const hasIcon = target?.container.querySelector('.blitz-header-icon-wrapper')
    
    // Re-inject if container exists but icon is missing
    return Boolean(target && !hasIcon)
  }

  /**
   * Collect normalized conversation turns from Grok's DOM.
   * @param {number} limit - maximum number of turns to return (most recent first)
   * @returns {Array<{role: 'user'|'assistant', parts: Array, turnId?: string, turnIndex?: number}>}
   */
  getRecentMessages(limit = 12) {
    const turnNodes = Array.from(document.querySelectorAll('div[id^="response-"]'))
    const normalized = []

    turnNodes.forEach((node, idx) => {
      const role = this.parseRole(node)
      if (!role) return

      const bubble = node.querySelector('.message-bubble')
      const text = this.collectTextFromBubble(bubble)
      if (!text) return

      normalized.push({
        role,
        parts: [{ type: 'text', value: text }],
        turnId: node.getAttribute('id') || null,
        turnIndex: idx
      })
    })

    normalized.sort((a, b) => (a.turnIndex ?? 0) - (b.turnIndex ?? 0))

    return normalized.slice(-limit)
  }

  /**
   * Return recent messages grouped by role (default: last 2 user and 2 assistant turns).
   * @param {Object} opts
   * @param {number} opts.userCount
   * @param {number} opts.assistantCount
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

      const targetCount = msg.role === 'user' ? userCount : assistantCount
      if (bucket.length < targetCount) {
        bucket.push(msg)
      }

      if (buckets.user.length >= userCount && buckets.assistant.length >= assistantCount) {
        break
      }
    }

    return {
      user: buckets.user.reverse(),
      assistant: buckets.assistant.reverse(),
      all: messages
    }
  }

  parseRole(node) {
    if (!node) return null
    const classList = node.classList || []
    if (classList.contains('items-end')) return 'user'
    if (classList.contains('items-start')) return 'assistant'
    return null
  }

  collectTextFromBubble(bubble) {
    if (!bubble) return null
    const text = (bubble.innerText || '').trim()
    return text || null
  }

  /**
   * Grok-specific styles
   * Matches Grok's design system with rounded buttons
   */
  static getStyles() {
    return `
      /* Grok Header Icon Styles */
      .blitz-header-icon-wrapper {
        display: inline-flex;
        align-items: center;
      }

      .blitz-header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 9999px;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.1s ease, color 0.1s ease;
        padding: 8px;
        color: var(--fg-primary, currentColor);
      }

      .blitz-header-btn:hover {
        background-color: var(--button-ghost-hover, rgba(0, 0, 0, 0.05));
      }

      /* Dark mode support for Grok */
      @media (prefers-color-scheme: dark) {
        .blitz-header-btn:hover {
          background-color: var(--button-ghost-hover, rgba(255, 255, 255, 0.1));
        }
      }

      .blitz-header-icon {
        width: 26px;
        height: 26px;
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
    `
  }
}
