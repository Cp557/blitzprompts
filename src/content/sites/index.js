// Site Adapters Index
// Each adapter handles site-specific header injection for different LLM websites

import { ChatGPTAdapter } from './chatgpt.js'
import { ClaudeAdapter } from './claude.js'
import { GeminiAdapter } from './gemini.js'
import { GrokAdapter } from './grok.js'
// TODO(perplexity): Re-enable when Perplexity support is restored.
// import { PerplexityAdapter } from './perplexity.js'

// Map of hostname patterns to their adapters
const siteAdapters = {
  'chatgpt.com': ChatGPTAdapter,
  'chat.openai.com': ChatGPTAdapter,
  'claude.ai': ClaudeAdapter,
  'gemini.google.com': GeminiAdapter,
  'grok.com': GrokAdapter,
  'x.com': GrokAdapter,
  // TODO(perplexity): Re-enable when Perplexity support is restored.
  // 'perplexity.ai': PerplexityAdapter,
}

/**
 * Get the appropriate site adapter for the current page
 * @returns {Object|null} The site adapter or null if not supported
 */
export function getSiteAdapter() {
  const hostname = window.location.hostname
  
  // Check for exact match first
  if (siteAdapters[hostname]) {
    return siteAdapters[hostname]
  }
  
  // Check for partial matches (e.g., subdomain support)
  for (const [pattern, adapter] of Object.entries(siteAdapters)) {
    if (hostname.includes(pattern) || hostname.endsWith(pattern)) {
      return adapter
    }
  }
  
  return null
}

/**
 * Check if the current site is supported
 * @returns {boolean}
 */
export function isSupportedSite() {
  return getSiteAdapter() !== null
}

/**
 * Get the current site name for logging/debugging
 * @returns {string}
 */
export function getCurrentSiteName() {
  const hostname = window.location.hostname
  
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'ChatGPT'
  }
  if (hostname.includes('claude.ai')) {
    return 'Claude'
  }
  if (hostname.includes('gemini.google.com')) {
    return 'Gemini'
  }
  if (hostname.includes('grok') || hostname === 'x.com') {
    return 'Grok'
  }
  // TODO(perplexity): Re-enable when Perplexity support is restored.
  // if (hostname.includes('perplexity.ai')) {
  //   return 'Perplexity'
  // }

  return 'Unknown'
}
