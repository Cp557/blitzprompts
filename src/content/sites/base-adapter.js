// Base Site Adapter
// All site-specific adapters should follow this interface

import { getLogoSvg } from '../constants/icons.js'

/**
 * Base class for site adapters
 * Each LLM website will have its own adapter that extends this class
 */
export class BaseSiteAdapter {
  constructor(panelInstance) {
    this.panel = panelInstance
    this.headerObserver = null
    this.debounceTimer = null
    this.currentUrl = window.location.href
    this.urlCheckTimer = null
  }

  /**
   * Get the site name for logging
   * @returns {string}
   */
  static getSiteName() {
    return 'Unknown'
  }

  /**
   * Create the header icon button element
   * Can be overridden by subclasses for site-specific styling
   * @returns {HTMLElement}
   */
  createHeaderIcon() {
    const wrapper = document.createElement("span")
    wrapper.className = "blitz-header-icon-wrapper"
    wrapper.setAttribute("data-state", "closed")
    
    const button = document.createElement("button")
    button.className = "blitz-header-btn"
    button.setAttribute("aria-label", "Open BlitzPrompts")
    button.setAttribute("type", "button")
    button.innerHTML = `<div class="blitz-header-icon">${getLogoSvg()}</div>`
    
    wrapper.appendChild(button)
    return wrapper
  }

  /**
   * Optional: return normalized recent messages from the current chat.
   * Subclasses can override to provide site-specific implementations.
   * @param {number} limit
   * @returns {Array<{role: 'user'|'assistant', parts: Array, turnId?: string, turnIndex?: number}>}
   */
  getRecentMessages(limit = 10) {
    void limit
    return []
  }

  /**
   * Optional helper to return recent messages grouped by role.
   * @param {Object} opts
   * @param {number} opts.userCount
   * @param {number} opts.assistantCount
   * @returns {{user: Array, assistant: Array, all: Array}}
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
   * Get the click handler for the header icon
   * @returns {Function}
   */
  getIconClickHandler() {
    return async (e) => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation?.()

      const { panel, overlay } = await this.ensurePanelElements()
      if (panel && overlay) {
        panel.classList.add('open')
        overlay.classList.add('visible')

        if (this.panel.showPromptHome) {
          await this.panel.showPromptHome()
        }
      } else {
        console.warn('[Extension] Unable to open BlitzPrompts panel: panel DOM is not mounted.')
      }
    }
  }

  async ensurePanelElements() {
    let panel = document.querySelector('.prompts-panel')
    let overlay = document.querySelector('.panel-overlay')

    if (panel && overlay) {
      return { panel, overlay }
    }

    if (typeof this.panel?.ensurePanelMounted === 'function') {
      this.panel.ensurePanelMounted()
    } else if (typeof this.panel?.init === 'function') {
      await this.panel.init()
    }

    panel = document.querySelector('.prompts-panel')
    overlay = document.querySelector('.panel-overlay')

    return { panel, overlay }
  }

  /**
   * Inject the icon into the site's header
   * Must be implemented by subclasses
   * @returns {boolean} - Whether injection was successful
   */
  injectHeaderIcon() {
    throw new Error('injectHeaderIcon must be implemented by subclass')
  }

  /**
   * Set up the mutation observer to re-inject icon when page changes
   * Can be overridden by subclasses for site-specific behavior
   */
  setupObserver() {
    if (this.headerObserver) {
      this.headerObserver.disconnect()
    }

    this.scheduleInjectionRetries()
    this.watchUrlChanges()

    this.headerObserver = new MutationObserver((mutations) => {
      void mutations
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      
      this.debounceTimer = setTimeout(() => {
        if (this.needsReinjection()) {
          this.injectHeaderIcon()
        }
      }, 100)
    })
    
    this.headerObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  scheduleInjectionRetries() {
    const retryDelays = [0, 250, 750, 1500, 3000, 6000, 10000, 15000]
    retryDelays.forEach((delay) => {
      setTimeout(() => {
        if (this.needsReinjection()) {
          this.injectHeaderIcon()
        }
      }, delay)
    })
  }

  watchUrlChanges() {
    if (this.urlCheckTimer) {
      clearInterval(this.urlCheckTimer)
    }

    this.currentUrl = window.location.href
    this.urlCheckTimer = setInterval(() => {
      if (window.location.href === this.currentUrl) return

      this.currentUrl = window.location.href
      document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())
      this.scheduleInjectionRetries()
    }, 500)
  }

  /**
   * Check if icon needs to be re-injected
   * Must be implemented by subclasses
   * @returns {boolean}
   */
  needsReinjection() {
    throw new Error('needsReinjection must be implemented by subclass')
  }

  /**
   * Clean up the adapter (disconnect observer, etc.)
   */
  cleanup() {
    if (this.headerObserver) {
      this.headerObserver.disconnect()
      this.headerObserver = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.urlCheckTimer) {
      clearInterval(this.urlCheckTimer)
      this.urlCheckTimer = null
    }
    // Remove any injected icons
    document.querySelectorAll('.blitz-header-icon-wrapper').forEach(el => el.remove())
  }

  /**
   * Get site-specific styles
   * Can be overridden by subclasses
   * @returns {string}
   */
  static getStyles() {
    return ''
  }
}
