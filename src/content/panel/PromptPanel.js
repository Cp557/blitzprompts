import { getPrompts, updatePromptOrder, exportPrompts, importPrompts } from '../services/api.js'
import { SecurityUtils } from '../services/security.js'
import { PlaceholderModal } from '../components/PlaceholderModal.js'
import { addIconSvg, settingsIconSvg } from '../constants/icons.js'
import { styles } from '../styles/index.js'
import { getSiteAdapter } from '../sites/index.js'
import { mergePromptWithEditorText } from '../utils/editor-text.js'

// Helper function to check if panel is open
function isPanelOpen() {
  const p = document.querySelector('.prompts-panel')
  return p && p.classList.contains('open')
}

export class PromptPanel {
  constructor() {
    this.currentView = "prompts"
    this.currentPrompts = []
    this.placeholderModal = new PlaceholderModal()
  }

  async init() {
    // Prevent duplicate panels
    if (document.querySelector('.prompts-panel') && document.querySelector('.panel-overlay')) {
      return true
    }

    try {
      this.currentPrompts = await this.fetchAllPrompts()

      if (!this.ensurePanelMounted()) {
        return false
      }

      // Initialize site-specific adapter after the panel toggle exists.
      this.initSiteAdapter();

      return true
    } catch (error) {
      console.error("[Extension] Init error:", error)
      return false
    }
  }

  injectStyles() {
    const upsertStyle = (id, textContent) => {
      let styleSheet = document.getElementById(id)
      if (!styleSheet) {
        styleSheet = document.createElement("style")
        styleSheet.id = id
        document.head.appendChild(styleSheet)
      }
      styleSheet.textContent = textContent
    }

    upsertStyle('blitz-panel-styles', styles)
    upsertStyle('blitz-button-styles', `
      .add-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #3b82f6;
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
      }
      .add-button:hover {
        background: #2563eb;
        transform: scale(1.05);
      }
      .add-button svg {
        width: 24px;
        height: 24px;
      }
    `)
  }

  ensurePanelMounted() {
    if (!document.body) return false

    let panel = document.querySelector('.prompts-panel')
    let overlay = document.querySelector('.panel-overlay')

    if (panel && overlay) {
      return true
    }

    panel?.remove()
    overlay?.remove()

    this.injectStyles()

    panel = this.createPanel()
    overlay = this.createOverlay()

    document.body.appendChild(panel)
    document.body.appendChild(overlay)

    this.attachEventListeners(overlay, panel)
    this.renderPrompts()

    return true
  }

  async fetchAllPrompts() {
    try {
      this.setPromptLoading(true); 
      return await getPrompts()
    } catch (error) {
      console.error("[Extension] fetchAllPrompts error:", error)
      return []
    } finally {
      this.setPromptLoading(false); 
    }
  }

  // Initialize site-specific adapter for header injection
  initSiteAdapter() {
    const SiteAdapterClass = getSiteAdapter()

    if (SiteAdapterClass) {
      this.siteAdapter = new SiteAdapterClass(this)

      // Inject site-specific styles
      const siteStyles = SiteAdapterClass.getStyles()
      if (siteStyles && !document.getElementById('blitz-site-styles')) {
        const styleEl = document.createElement('style')
        styleEl.id = 'blitz-site-styles'
        styleEl.textContent = siteStyles
        document.head.appendChild(styleEl)
      }

      // Inject icon and set up observer
      this.siteAdapter.injectHeaderIcon()
      this.siteAdapter.setupObserver()
    }
  }

  createOverlay() {
    const overlay = document.createElement("div")
    overlay.className = "panel-overlay"
    return overlay
  }

  setPromptLoading(isLoading) {
    const container = document.querySelector('.prompts-container');
    if (!container) return;
    container.classList.toggle('loading', isLoading);
  }

  createPanel() {
    const panel = document.createElement("div")
    panel.className = "prompts-panel"
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-header-row">
          <div class="search-container">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="search-input" placeholder="Search prompts..." autocomplete="off">
          </div>
          <div class="panel-header-actions">
            <button class="toolbar-btn settings-btn" data-action="settings" title="Import / Export prompts">
              ${settingsIconSvg}
            </button>
          </div>
        </div>
        <button class="close-button" data-action="close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="prompts-container"></div>
    `

    // Single delegated click handler for all button actions
    panel.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]')
      if (!target) return

      const action = target.dataset.action
      switch (action) {
        case 'close':
          if (this.togglePanel) this.togglePanel()
          break
        case 'settings':
          e.stopPropagation()
          this.showSettingsDialog()
          break
        case 'back':
          this.handleBackNavigation()
          break
        case 'add-prompt':
          this.handleAddPromptClick()
          break
      }
    })

    // Single delegated input handler for search
    panel.addEventListener('input', this.debounce((e) => {
      if (e.target.matches('.search-input')) {
        this.handleSearchInput(e)
      }
    }, 300))

    // Add the button to the panel
    const addButton = this.createAddPromptButton()
    panel.appendChild(addButton)

    // Add direct click handler to close button as backup
    const closeBtn = panel.querySelector('.close-button')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.togglePanel) this.togglePanel()
      })
    }

    return panel
  }

  async showPromptHome({ refresh = true } = {}) {
    this.currentView = 'prompts'
    if (refresh) {
      this.currentPrompts = await this.fetchAllPrompts()
    }

    this.updateHeader()
    this.renderPrompts()

    const addButton = document.querySelector('.add-button')
    if (addButton) {
      const newAddButton = this.createAddPromptButton()
      addButton.parentNode.replaceChild(newAddButton, addButton)
      newAddButton.style.display = isPanelOpen() ? 'flex' : 'none'
    }
  }

  /**
   * Handle search input (delegated)
   */
  handleSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase()

    if (this.currentView === "prompts") {
      const filteredPrompts = this.currentPrompts.filter((prompt) =>
        (prompt.text && prompt.text.toLowerCase().includes(searchTerm)) ||
        (prompt.title && prompt.title.toLowerCase().includes(searchTerm))
      )
      this.renderPrompts(filteredPrompts)
    }
  }

  /**
   * Handle back navigation (delegated)
   */
  handleBackNavigation() {
    if (this.currentView === 'filling') {
      this.currentFillingPrompt = null
      this.fillingValues = {}
      this.fillingPlaceholders = []
      this.currentView = 'prompts'
      this.updateHeader()
      this.renderPrompts()
    } else if (this.currentView === 'editing') {
      if (this.checkUnsavedEditChanges && this.checkUnsavedEditChanges()) {
        this.showConfirmationDialog('You have unsaved changes. Are you sure you want to discard them?', () => {
          this.currentEditingPrompt = null
          this.currentFillingPrompt = this.lastViewedPrompt
          this.currentView = 'filling'
          this.updateHeader()
          this.renderFillingView(this.lastViewedPrompt)
        })
        return
      }
      this.currentEditingPrompt = null
      this.currentFillingPrompt = this.lastViewedPrompt
      this.currentView = 'filling'
      this.updateHeader()
      this.renderFillingView(this.lastViewedPrompt)
    } else if (this.currentView === 'creation') {
      if (this.checkUnsavedCreationChanges && this.checkUnsavedCreationChanges()) {
        this.showConfirmationDialog('You have unsaved changes. Are you sure you want to discard them?', () => {
          this.showPromptHome()
        })
        return
      }
      this.showPromptHome()
    } else {
      this.showPromptHome()
    }
  }

  createAddPromptButton() {
    const button = document.createElement("button")
    button.className = "add-button"
    button.innerHTML = addIconSvg
    button.title = "Add New Prompt"
    button.setAttribute("data-action", "add-prompt")

    if (isPanelOpen() && this.currentView === "prompts") {
      button.style.display = "flex"
    } else {
      button.style.display = "none"
    }

    return button
  }

  async handleAddPromptClick() {
    this.currentView = 'creation'
    this.renderCreationView()
  }

  renderPrompts(prompts = this.currentPrompts) {
    const container = document.querySelector('.prompts-container')
    if (!container) return
    
    const addButton = document.querySelector('.add-button')
    if (addButton) addButton.style.display = isPanelOpen() ? 'flex' : 'none'
    if (addButton) {
      addButton.style.display = "flex"
      const newAddButton = this.createAddPromptButton()
      addButton.parentNode.replaceChild(newAddButton, addButton)
      newAddButton.style.display = "flex"
    }

    if (!prompts || prompts.length === 0) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px;">
          <div style="color: #6b7280; font-size: 16px; font-weight: 500;">No prompts yet</div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">Add prompts to get started</p>
        </div>
      `
      return
    }

    container.innerHTML = `
      <div class="prompts-wrapper">
        ${prompts.map((prompt, index) => {
          const cleanedText = (prompt.text || '').trim()
          const hasPlaceholders = /\{\{[^}]+\}\}/.test(cleanedText)
          const title = prompt.title 
            ? SecurityUtils.escapeHtml(prompt.title) 
            : SecurityUtils.escapeHtml(cleanedText.split('\n')[0].substring(0, 80) + (cleanedText.length > 80 ? '...' : ''))
          
          return `
            <div class="drop-indicator" data-index="${index}"></div>
            <div class="prompt-card" 
                 data-prompt-id="${prompt.id}" 
                 data-index="${index}"
                 data-has-placeholders="${hasPlaceholders}">
              <div class="drag-handle">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
              <h4 class="prompt-title ${!prompt.title ? 'no-title' : ''}">${title}</h4>
            </div>
          `
        }).join('')}
        <div class="drop-indicator" data-index="${prompts.length}"></div>
      </div>
    `

      this.attachPromptHandlers(container)
      this.attachDragAndDropHandlers(container)
  }

  cleanup() {
    if (this.placeholderModal) {
      this.placeholderModal.destroy()
    }
    if (this.spotlightTour) {
      this.spotlightTour.destroy()
    }
    const modalOverlay = document.querySelector('.modal-overlay')
    if (modalOverlay) modalOverlay.remove()
  }

  attachDragAndDropHandlers(container) {
    const wrapper = container.querySelector('.prompts-wrapper')
    if (!wrapper) return
  
    let draggedCard = null
    let draggedIndex = null
    let isDragging = false
  
    const getClosestDropIndicator = (y) => {
      const indicators = [...wrapper.querySelectorAll('.drop-indicator')]
      let closestIndicator = null
      let closestDistance = Infinity
  
      indicators.forEach(indicator => {
        const rect = indicator.getBoundingClientRect()
        const distance = Math.abs(y - rect.top)
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndicator = indicator
        }
      })
  
      return closestIndicator
    }
  
    wrapper.addEventListener('mousedown', (e) => {
      const dragHandle = e.target.closest('.drag-handle')
      if (dragHandle) {
        isDragging = true
        const card = dragHandle.closest('.prompt-card')
        card.setAttribute('draggable', 'true')
      }
    })
  
    wrapper.addEventListener('mouseup', () => {
      isDragging = false
      wrapper.querySelectorAll('.prompt-card').forEach(card => {
        card.setAttribute('draggable', 'false')
      })
    })
  
    wrapper.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.prompt-card')
      if (!card || !isDragging) {
        e.preventDefault()
        return
      }
  
      draggedCard = card
      draggedIndex = parseInt(card.dataset.index)
      card.classList.add('dragging')
      
      e.dataTransfer.setDragImage(card, 10, card.offsetHeight / 2)
      e.dataTransfer.effectAllowed = 'move'
    })
  
    wrapper.addEventListener('dragend', () => {
      if (draggedCard) {
        draggedCard.classList.remove('dragging')
        draggedCard.setAttribute('draggable', 'false')
        draggedCard = null
        draggedIndex = null
        isDragging = false
        
        wrapper.querySelectorAll('.drop-indicator').forEach(indicator => {
          indicator.classList.remove('active')
        })
      }
    })
  
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      
      if (!draggedCard) return
  
      const indicator = getClosestDropIndicator(e.clientY)
      if (indicator) {
        wrapper.querySelectorAll('.drop-indicator').forEach(di => {
          di.classList.remove('active')
        })
        indicator.classList.add('active')
      }
    })
  
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault()
      if (!draggedCard) return
  
      const indicator = getClosestDropIndicator(e.clientY)
      if (!indicator) return
  
      const dropIndex = parseInt(indicator.dataset.index)
      if (isNaN(dropIndex) || dropIndex === draggedIndex) return
  
      const [movedPrompt] = this.currentPrompts.splice(draggedIndex, 1)
      const actualDropIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
      this.currentPrompts.splice(actualDropIndex, 0, movedPrompt)
  
      this.renderPrompts()
      this.savePromptOrder()
    })

  }

  async savePromptOrder() {
    try {
      await updatePromptOrder(this.currentPrompts)
    } catch (error) {
      console.error('[Extension] Failed to save prompt order:', error)
    }
  }

  attachPromptHandlers(container) {
    const promptCards = container.querySelectorAll(".prompt-card")
    promptCards.forEach((card) => {
      card.addEventListener("click", () => {
        const promptId = card.dataset.promptId
        const prompt = this.currentPrompts.find(p => p.id == promptId)
        
        if (prompt) {
          this.currentView = 'filling';
          this.renderFillingView(prompt);
        }
      })
    })
  }

  setupSearch(panel) {
    const searchInput = panel.querySelector(".search-input")
    if (!searchInput) return
    
    searchInput.addEventListener(
      "input",
      this.debounce(async (e) => {
        const searchTerm = e.target.value.toLowerCase()
        
        const filteredPrompts = this.currentPrompts.filter((prompt) =>
          (prompt.text && prompt.text.toLowerCase().includes(searchTerm)) ||
          (prompt.title && prompt.title.toLowerCase().includes(searchTerm))
        )
        this.renderPrompts(filteredPrompts)
      }, 300)
    )
  }

  updateHeader() {
    const header = document.querySelector(".panel-header")
    if (!header) return

    if (this.currentView === "prompts") {
      header.innerHTML = `
        <div class="panel-header-row">
          <div class="search-container">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="search-input" placeholder="Search prompts..." autocomplete="off">
          </div>
          <div class="panel-header-actions">
            <button class="toolbar-btn settings-btn" data-action="settings" title="Import / Export prompts">
              ${settingsIconSvg}
            </button>
          </div>
        </div>
        <button class="close-button" data-action="close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      `
      const searchInput = header.querySelector('.search-input')
      if (searchInput) searchInput.placeholder = 'Search prompts...'
    } else {
      const headerTitle = ""

      header.innerHTML = `
        <div class="panel-header-subview">
          <button class="back-button group" data-action="back">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" class="group-hover:text-blue-500">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div class="prompt-panel-header-title">${headerTitle}</div>
        </div>
        <button class="close-button" data-action="close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      `
    }
    // Add direct click handler to close button as backup
    const closeBtn = header.querySelector('.close-button')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.togglePanel) this.togglePanel()
      })
    }
  }

  insertPromptToEditor(promptText) {
  
    // Gemini: its editor is a Quill-based contenteditable; handle separately
    if (window?.location?.hostname?.includes('gemini.google.com')) {
      const geminiSelectors = [
        'rich-textarea div.ql-editor.textarea.new-input-ui',
        'rich-textarea div.ql-editor',
        'div.ql-editor[contenteditable="true"]'
      ]
      const geminiEditor = geminiSelectors
        .map(sel => document.querySelector(sel))
        .find(Boolean)
      if (geminiEditor) {
        const existingText = (geminiEditor.textContent || '').trim()
        const finalText = mergePromptWithEditorText(existingText, promptText)

        const lines = finalText.split(/\r?\n/)
        const paragraphs = lines.map((line) => {
          const trimmed = line.trim()
          return trimmed === "" ? "<p><br></p>" : `<p>${SecurityUtils.escapeHtml(trimmed)}</p>`
        })

        geminiEditor.innerHTML = paragraphs.join("")

        // Trigger Angular/Material change detection
        geminiEditor.dispatchEvent(new Event("input", { bubbles: true }))
        geminiEditor.dispatchEvent(new Event("change", { bubbles: true }))

        geminiEditor.focus()
        const range = document.createRange()
        range.selectNodeContents(geminiEditor)
        range.collapse(false)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)

        return
      }
    }

    // Perplexity: ask input (contenteditable) with span inside <p>
    if (window?.location?.hostname?.includes('perplexity.ai')) {
      const perplexitySelectors = [
        '#ask-input [contenteditable="true"]',
        '#ask-input > p > span',
        '#ask-input > p',
        '#ask-input',
        '[data-testid="ask-input"] [contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]',
        'textarea[placeholder*="Ask"]',
        'textarea'
      ]
      const pxEditor = perplexitySelectors
        .map(sel => document.querySelector(sel))
        .find(Boolean)
      if (pxEditor) {
        const isTextarea = pxEditor.tagName === 'TEXTAREA'
        const existingText = (isTextarea ? pxEditor.value : pxEditor.textContent || '').trim()
        const finalText = mergePromptWithEditorText(existingText, promptText)

        if (isTextarea) {
          // Use native setter to trigger React-style listeners
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
          setter ? setter.call(pxEditor, finalText) : (pxEditor.value = finalText)
          pxEditor.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
          pxEditor.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
          pxEditor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }))
          pxEditor.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true, composed: true }))
          pxEditor.focus()
          try {
            pxEditor.setSelectionRange(finalText.length, finalText.length)
          } catch {
            /* ignore */
          }
          return
        }

        // Explicitly write HTML with <br> to preserve newlines in Perplexity's inline editor
        pxEditor.focus()
        const lines = finalText.split(/\r?\n/)
        const paragraphs = lines.map((line) => {
          const trimmed = line.trim()
          return trimmed === "" ? "<br>" : SecurityUtils.escapeHtml(trimmed)
        })
        pxEditor.innerHTML = paragraphs.join("<br>")

        pxEditor.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
        pxEditor.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
        pxEditor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }))
        pxEditor.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true, composed: true }))

        // Place caret at end
        pxEditor.focus()
        const rangeEnd = document.createRange()
        rangeEnd.selectNodeContents(pxEditor)
        rangeEnd.collapse(false)
        const selectionEnd = window.getSelection()
        selectionEnd.removeAllRanges()
        selectionEnd.addRange(rangeEnd)

        return
      }
    }

    const editor = document.querySelector('div[contenteditable="true"].ProseMirror')
    if (!editor) return
  
    const existingText = editor.textContent.trim()
    const finalText = mergePromptWithEditorText(existingText, promptText)
  
    const lines = finalText.split(/\r?\n/)
    const paragraphs = lines.map((line) => {
      const trimmed = line.trim()
      return trimmed === "" ? "<p><br></p>" : `<p>${SecurityUtils.escapeHtml(trimmed)}</p>`
    })
  
    editor.innerHTML = paragraphs.join("")
  
    editor.dispatchEvent(new Event("input", { bubbles: true }))
    editor.focus()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
  
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    
  }

  async copyPromptsToClipboard() {
    const json = await exportPrompts()
    if (!json || JSON.parse(json).prompts.length === 0) {
      this.showToast('No prompts to export', 'error')
      return
    }

    let copied = false
    try {
      await navigator.clipboard.writeText(json)
      copied = true
    } catch {
      // Clipboard API can be blocked; fall back to a temporary textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = json
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try {
        copied = document.execCommand('copy')
      } catch {
        copied = false
      }
      ta.remove()
    }

    this.showToast(
      copied ? 'Prompts copied to clipboard as JSON' : 'Could not access clipboard',
      copied ? 'success' : 'error',
    )
  }

  showSettingsDialog() {
    const existing = document.querySelector('.blitz-settings-dialog')
    if (existing) {
      existing.remove()
      return
    }

    const dialog = document.createElement('div')
    dialog.className = 'blitz-settings-dialog'
    dialog.innerHTML = `
      <div class="settings-dialog-content">
        <div class="settings-dialog-header">
          <span>Import / Export</span>
          <button class="settings-dialog-close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Export</div>
          <p class="settings-hint">Copy all your prompts as JSON to the clipboard.</p>
          <button class="settings-action settings-copy">Copy all prompts (JSON)</button>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Import</div>
          <p class="settings-hint">Paste JSON below. Imported prompts are added to your existing ones.</p>
          <textarea class="settings-textarea" placeholder='{ "prompts": [ { "title": "Example", "content": "Your prompt..." } ] }' spellcheck="false"></textarea>
          <button class="settings-action settings-import">Import prompts</button>
        </div>
      </div>
    `

    if (!document.getElementById('blitz-settings-dialog-styles')) {
      const style = document.createElement('style')
      style.id = 'blitz-settings-dialog-styles'
      style.textContent = `
        .blitz-settings-dialog {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
        }
        .settings-dialog-content {
          background: white;
          border-radius: 12px;
          padding: 20px;
          width: 90%;
          max-width: 460px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          box-sizing: border-box;
        }
        .settings-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 16px;
          color: #1e40af;
          margin-bottom: 16px;
        }
        .settings-dialog-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          width: 24px;
          height: 24px;
          padding: 0;
        }
        .settings-dialog-close svg { width: 20px; height: 20px; }
        .settings-dialog-close:hover { color: #111827; }
        .settings-section {
          padding: 12px 0;
          border-top: 1px solid #f3f4f6;
        }
        .settings-section:first-of-type { border-top: none; }
        .settings-section-title {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          margin-bottom: 4px;
        }
        .settings-hint {
          margin: 0 0 10px;
          font-size: 13px;
          color: #6b7280;
        }
        .settings-textarea {
          width: 100%;
          min-height: 140px;
          resize: vertical;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          color: #111827;
          box-sizing: border-box;
          margin-bottom: 10px;
        }
        .settings-textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .settings-action {
          width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: #3b82f6;
          border: none;
          color: white;
          transition: background 0.2s ease;
        }
        .settings-action:hover { background: #2563eb; }
        .settings-action:disabled { opacity: 0.6; cursor: not-allowed; }
        .settings-copy {
          background: #f0f9ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
        .settings-copy:hover { background: #e0f2fe; }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(dialog)

    const textarea = dialog.querySelector('.settings-textarea')
    const copyBtn = dialog.querySelector('.settings-copy')
    const importBtn = dialog.querySelector('.settings-import')
    const closeBtn = dialog.querySelector('.settings-dialog-close')

    const close = () => dialog.remove()
    closeBtn.addEventListener('click', close)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close()
    })

    copyBtn.addEventListener('click', () => this.copyPromptsToClipboard())

    importBtn.addEventListener('click', async () => {
      importBtn.disabled = true
      try {
        const { imported } = await importPrompts(textarea.value)
        close()
        await this.showPromptHome()
        this.showToast(`Imported ${imported} prompt${imported === 1 ? '' : 's'}`, 'success')
      } catch (error) {
        importBtn.disabled = false
        this.showToast(error.message || 'Import failed', 'error')
      }
    })
  }

  showToast(message, type = "success") {
    const panel = document.querySelector('.prompts-panel')
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message
    ;(panel || document.body).appendChild(toast)

    setTimeout(() => {
      toast.style.transform = "translateX(120%)"
      setTimeout(() => toast.remove(), 300)
    }, 2000)
  }

  debounce(func, wait) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  attachEventListeners(overlay, panel) {
    const togglePanel = async () => {
      const isOpen = panel.classList.toggle("open")
      overlay.classList.toggle("visible")

      if (isOpen) {
        await this.showPromptHome()
      } else {
        const addButton = document.querySelector(".add-button")
        if (addButton) {
          addButton.style.display = "none"
        }
      }
    }

    overlay.addEventListener("click", togglePanel)
    this.togglePanel = togglePanel
  }

  // Placeholder methods to be overridden in extended class
  renderFillingView(_prompt) {}
  renderCreationView() {}
  checkUnsavedEditChanges() { return false }
  checkUnsavedCreationChanges() { return false }
  showConfirmationDialog(_message, _onConfirm) {}
}
