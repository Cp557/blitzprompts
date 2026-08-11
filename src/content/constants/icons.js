import { Settings01Icon } from '@hugeicons/core-free-icons'

function iconNodeToSvg([tagName, attributes]) {
  const svgAttributes = Object.entries(attributes)
    .filter(([name]) => name !== 'key')
    .map(([name, value]) => {
      const attributeName = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
      return `${attributeName}="${value}"`
    })
    .join(' ')

  return `<${tagName} ${svgAttributes}></${tagName}>`
}

export const settingsIconSvg = `
<svg class="hugeicons-settings-01" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  ${Settings01Icon.map(iconNodeToSvg).join('')}
</svg>
`

export const addIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="12" y1="5" x2="12" y2="19"></line>
  <line x1="5" y1="12" x2="19" y2="12"></line>
</svg>
`

/**
 * Detect if the current site is in dark mode
 * Checks multiple indicators to work across all LLM sites:
 * - ChatGPT: html.dark class
 * - Claude: html[data-theme="dark"]
 * - Gemini: html with dark theme
 * - Grok: typically dark by default
 * - Perplexity: color-scheme style property or computed background color
 */
export const isDarkMode = () => {
  const html = document.documentElement
  const body = document.body
  
  // Check for common dark mode class on html or body
  if (html.classList.contains('dark') || body?.classList.contains('dark')) {
    return true
  }
  
  // Check for data-theme attribute (Claude uses this)
  const dataTheme = html.getAttribute('data-theme') || body?.getAttribute('data-theme')
  if (dataTheme === 'dark') {
    return true
  }
  
  // Check for data-color-mode attribute
  const colorMode = html.getAttribute('data-color-mode') || body?.getAttribute('data-color-mode')
  if (colorMode === 'dark') {
    return true
  }
  
  // Check for color-scheme style property (Perplexity uses this)
  const htmlColorScheme = html.style.colorScheme || window.getComputedStyle(html).colorScheme
  if (htmlColorScheme === 'dark') {
    return true
  }
  if (htmlColorScheme === 'light') {
    return false
  }
  
  // Check for data-color-scheme attribute
  const dataColorScheme = html.getAttribute('data-color-scheme') || body?.getAttribute('data-color-scheme')
  if (dataColorScheme === 'dark') {
    return true
  }
  if (dataColorScheme === 'light') {
    return false
  }
  
  // Check computed background color - if it's dark, assume dark mode
  // This is more reliable than prefers-color-scheme for detecting actual page theme
  const bgColor = window.getComputedStyle(body || html).backgroundColor
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    // Parse rgb/rgba values
    const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const [, r, g, b] = match.map(Number)
      // Calculate luminance - if below threshold, it's dark mode
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return luminance < 0.5
    }
  }
  
  // Last resort: check prefers-color-scheme media query
  // Only used if we couldn't determine theme from the page itself
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true
  }
  
  return false
}

// Get the light mode logo URL
export const getLightLogoUrl = () => chrome.runtime.getURL('logo.svg')

// Get the dark mode logo URL
export const getDarkLogoUrl = () => chrome.runtime.getURL('darkmode_logo.svg')

// Get the appropriate logo URL based on current theme
export const getLogoUrl = () => isDarkMode() ? getDarkLogoUrl() : getLightLogoUrl()

// Logo as an img tag for use in content scripts (dynamic based on theme)
export const getLogoSvg = () => `<img src="${getLogoUrl()}" alt="BlitzPrompts" style="width: 100%; height: 100%;" />`
