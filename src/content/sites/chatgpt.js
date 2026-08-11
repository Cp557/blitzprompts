// ChatGPT Site Adapter
// Handles header injection for chatgpt.com and chat.openai.com

import { BaseSiteAdapter } from './base-adapter.js'
import { getLogoSvg } from '../constants/icons.js'

/**
 * ChatGPT-specific adapter for header icon injection
 * 
 * ChatGPT has two header areas:
 * 1. Desktop header (#page-header): Contains #conversation-header-actions with action buttons
 * 2. Mobile header (.draggable.md:hidden): Contains action buttons in a flex container
 * 
 * The icon is injected to the LEFT of the "Start a group chat" and "Turn on temporary chat" buttons
 */
export class ChatGPTAdapter extends BaseSiteAdapter {
  constructor(panelInstance) {
    super(panelInstance)
  }

  static getSiteName() {
    return 'ChatGPT'
  }

  /**
   * Create ChatGPT-styled header icon
   * Matches ChatGPT's native button styling
   */
  createHeaderIcon() {
    const wrapper = document.createElement("span")
    wrapper.className = "blitz-header-icon-wrapper"
    wrapper.setAttribute("data-state", "closed")
    
    const button = document.createElement("button")
    // Use ChatGPT's native button classes for consistent styling
    button.className = "blitz-header-btn text-token-text-primary no-draggable hover:bg-token-surface-hover touch:h-10 touch:w-10 flex h-9 w-9 items-center justify-center rounded-lg focus:outline-none"
    button.setAttribute("aria-label", "Open BlitzPrompts")
    button.setAttribute("type", "button")
    button.innerHTML = `<div class="blitz-header-icon">${getLogoSvg()}</div>`
    
    wrapper.appendChild(button)
    return wrapper
  }

  /**
   * Inject icon into ChatGPT's header bar
   * Handles both desktop and mobile headers
   */
  injectHeaderIcon() {
    // Remove any existing injected icons first
    document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())
    
    let injectedSuccessfully = false
    const clickHandler = this.getIconClickHandler()
    
    // Try desktop header first (#conversation-header-actions)
    const desktopActions = document.querySelector('#conversation-header-actions')
    if (desktopActions) {
      const headerIcon = this.createHeaderIcon()
      headerIcon.querySelector('button').addEventListener('click', clickHandler)
      // Insert at the beginning (left side of the action buttons)
      desktopActions.insertBefore(headerIcon, desktopActions.firstChild)
      injectedSuccessfully = true
    }
    
    // Try mobile header (the container with group chat and temporary chat buttons)
    const mobileHeader = document.querySelector('.draggable.h-header-height.md\\:hidden .no-draggable.flex.items-center.justify-center')
    if (mobileHeader) {
      const headerIcon = this.createHeaderIcon()
      headerIcon.querySelector('button').addEventListener('click', clickHandler)
      // Insert at the beginning
      mobileHeader.insertBefore(headerIcon, mobileHeader.firstChild)
      injectedSuccessfully = true
    }
    
    return injectedSuccessfully
  }

  /**
   * Check if ChatGPT header needs re-injection
   */
  needsReinjection() {
    const desktopActions = document.querySelector('#conversation-header-actions')
    const mobileHeader = document.querySelector('.draggable.h-header-height.md\\:hidden .no-draggable.flex.items-center.justify-center')
    
    const hasDesktopIcon = desktopActions?.querySelector('.blitz-header-icon-wrapper')
    const hasMobileIcon = mobileHeader?.querySelector('.blitz-header-icon-wrapper')
    
    // Re-inject if containers exist but icons are missing
    const needsDesktopInjection = desktopActions && !hasDesktopIcon
    const needsMobileInjection = mobileHeader && !hasMobileIcon
    
    return needsDesktopInjection || needsMobileInjection
  }

  /**
   * Collect normalized conversation turns from ChatGPT's DOM.
   * @param {number} limit - maximum number of turns to return (most recent first)
   * @returns {Array<{role: 'user'|'assistant', parts: Array, turnId?: string, turnIndex?: number}>}
   */
  getRecentMessages(limit = 12) {
    const articles = Array.from(
      document.querySelectorAll('article[data-testid^="conversation-turn-"][data-turn]')
    )

    const normalized = articles
      .map((article) => this.normalizeArticleTurn(article))
      .filter(Boolean)

    // Sort by parsed turn index to keep chronological order, then slice to newest
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

  normalizeArticleTurn(article) {
    if (!article) return null
    const role = article.getAttribute('data-turn') || article.dataset.turn
    if (!role) return null

    const testId = article.getAttribute('data-testid') || ''
    const turnIndex = this.parseTurnIndex(testId)

    const turnId = article.getAttribute('data-turn-id') || article.dataset.turnId || null
    const authorBlocks = Array.from(article.querySelectorAll('[data-message-author-role]'))
    const parts = []

    if (authorBlocks.length) {
      authorBlocks.forEach((block) => {
        this.collectPartsFromNode(block, parts)
      })
    } else {
      // Fallback to the entire article body as text if author blocks are missing
      const fallbackText = (article.innerText || '').trim()
      if (fallbackText) {
        parts.push({ type: 'text', value: fallbackText })
      }
    }

    if (!parts.length) {
      return null
    }

    return { role, turnId, turnIndex, parts }
  }

  parseTurnIndex(testId) {
    const match = /conversation-turn-(\d+)/.exec(testId || '')
    return match ? parseInt(match[1], 10) : null
  }

  collectPartsFromNode(node, parts) {
    if (!node) return
    const text = (node.innerText || '').trim()
    if (text) {
      parts.push({ type: 'text', value: text })
    }

    const images = Array.from(node.querySelectorAll('img'))
    images.forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || ''
      if (!src) return

      parts.push({
        type: 'image',
        src,
        alt: img.alt || img.getAttribute('aria-label') || '',
        width: img.naturalWidth || img.width || null,
        height: img.naturalHeight || img.height || null
      })
    })
  }

  /**
   * ChatGPT-specific styles
   */
  static getStyles() {
    return `
      /* ChatGPT Header Icon Styles */
      .blitz-header-icon-wrapper {
        display: inline-flex;
      }

      .blitz-header-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.2s ease;
        padding: 0;
      }

      .blitz-header-btn:hover {
        background-color: var(--token-surface-hover, rgba(0, 0, 0, 0.05));
      }

      .blitz-header-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .blitz-header-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /* Touch device adjustments for ChatGPT */
      @media (pointer: coarse) {
        .blitz-header-btn {
          width: 40px;
          height: 40px;
        }
      }
    `
  }
}
