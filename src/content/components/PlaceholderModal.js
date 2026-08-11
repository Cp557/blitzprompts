import { SecurityUtils } from '../services/security.js'

export class PlaceholderModal {
  constructor() {
    this.modal = null
    this.currentPrompt = null
    this.currentPromptObj = null // Store the full prompt object
    this.placeholders = []
    this.values = {}
    this.onApply = null
    this.isVisible = false
    this.onPromptEdited = null // Callback for prompt edit
    this.parentPanel = null // Reference to parent panel for edit modal
  }

  createModal() {
    const modal = document.createElement('div')
    modal.className = 'blitz-placeholder-modal'
    modal.innerHTML = `
      <div class="blitz-placeholder-container">
        <div class="blitz-placeholder-header">
          <div class="placeholder-title-row" style="display:flex;align-items:center;gap:8px;">
            <span class="blitz-placeholder-title"></span>
            <button class="blitz-placeholder-edit-btn" title="Edit prompt" style="display:none;margin-left:8px;background:none;border:none;cursor:pointer;padding:2px;border-radius:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          </div>
          <button class="blitz-close-placeholder-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="blitz-prompt-preview"></div>
        <div class="blitz-placeholder-inputs"></div>
        <div class="blitz-placeholder-actions">
          <button class="blitz-btn-apply">Insert</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)
    this.modal = modal
    this.attachEventListeners()
    return modal
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.blitz-close-placeholder-btn')
    const applyBtn = this.modal.querySelector('.blitz-btn-apply')
    const editBtn = this.modal.querySelector('.blitz-placeholder-edit-btn')

    closeBtn.addEventListener('click', () => this.hide())
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide()
    })

    applyBtn.addEventListener('click', () => {
      if (this.onApply) {
        const replacedText = this.getReplacedPromptText()
        this.onApply(replacedText)
      }
      this.hide()
    })

    // Listen for Ctrl+Enter key on textareas to submit
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey && e.target.classList.contains('blitz-placeholder-input')) {
        // Only process if all inputs have values
        const allInputsFilled = this.checkAllInputsFilled()
        if (allInputsFilled) {
          applyBtn.click()
        }
      }
    })

    // Edit button handler
    editBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.currentPromptObj || !this.parentPanel) return;
      // Switch to edit view in the panel instead of using a modal
      if (this.parentPanel) {
        this.hide(); // Hide the placeholder modal first
        
        // Store a reference to the callbacks
        const onComplete = (updatedPrompt, isDeleted) => {
          if (isDeleted) {
            if (typeof this.onPromptEdited === 'function') this.onPromptEdited(null, true);
          } else if (updatedPrompt) {
            // We'll need to re-open the placeholder modal with the updated prompt
            this.currentPromptObj = { ...this.currentPromptObj, ...updatedPrompt };
            this.currentPrompt = this.currentPromptObj.text;
            this.show(this.currentPromptObj, this.onApply, this.parentPanel, this.onPromptEdited);
            if (typeof this.onPromptEdited === 'function') this.onPromptEdited(this.currentPromptObj, false);
          }
        };
        
        // Store the callback in the panel so it can be called when editing is complete
        this.parentPanel.editPromptCallback = onComplete;
        
        // Switch to edit view
        this.parentPanel.currentView = 'editing';
        this.parentPanel.renderEditingView(this.currentPromptObj);
      }
    });
  }

  updateTitle() {
    const titleEl = this.modal.querySelector('.blitz-placeholder-title');
    if (!titleEl) return;
    if (this.currentPromptObj && this.currentPromptObj.title) {
      titleEl.textContent = this.currentPromptObj.title;
    } else {
      titleEl.textContent = 'Prompt';
    }
  }

  extractPlaceholders(text) {
    const regex = /\{\{([^}]+)\}\}/g
    const placeholders = []
    let match

    while ((match = regex.exec(text)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1])
      }
    }

    return placeholders
  }

  updatePreview() {
    const previewEl = this.modal.querySelector('.blitz-prompt-preview')
    if (!previewEl || !this.currentPrompt) return

    let previewHtml = SecurityUtils.escapeHtml(this.currentPrompt)
    
    // Highlight placeholders
    this.placeholders.forEach(placeholder => {
      const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g')
      const replacement = this.values[placeholder] 
        ? `<span class="filled">${SecurityUtils.escapeHtml(this.values[placeholder])}</span>` 
        : `<span class="highlight">{{${SecurityUtils.escapeHtml(placeholder)}}}</span>`
      
      previewHtml = previewHtml.replace(regex, replacement)
    })

    previewEl.innerHTML = previewHtml
  }

  updateInputFields() {
    const inputsContainer = this.modal.querySelector('.blitz-placeholder-inputs')
    if (!inputsContainer) return
    
    inputsContainer.innerHTML = ''
    
    this.placeholders.forEach(placeholder => {
      const inputGroup = document.createElement('div')
      inputGroup.className = 'blitz-placeholder-input-group'
      
      const label = document.createElement('label')
      label.className = 'blitz-placeholder-label'
      label.textContent = placeholder
      label.htmlFor = `blitz-placeholder-${placeholder}`
      
      const textarea = document.createElement('textarea')
      textarea.className = 'blitz-placeholder-input'
      textarea.id = `blitz-placeholder-${placeholder}`
      textarea.placeholder = ''
      textarea.value = this.values[placeholder] || ''
      textarea.setAttribute('autocomplete', 'off')

      textarea.addEventListener('input', (e) => {
        this.values[placeholder] = e.target.value
        this.updatePreview()
        this.updateApplyButton()
      })

      inputGroup.appendChild(label)
      inputGroup.appendChild(textarea)
      inputsContainer.appendChild(inputGroup)
    })
  }

  updateApplyButton() {
    const applyBtn = this.modal.querySelector('.blitz-btn-apply')
    if (!applyBtn) return
    
    const allInputsFilled = this.checkAllInputsFilled()
    applyBtn.disabled = !allInputsFilled
  }

  checkAllInputsFilled() {
    return this.placeholders.every(placeholder => 
      this.values[placeholder] && this.values[placeholder].trim() !== ''
    )
  }

  getReplacedPromptText() {
    if (!this.currentPrompt) return ''
    
    let result = this.currentPrompt
    
    this.placeholders.forEach(placeholder => {
      if (this.values[placeholder]) {
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g')
        result = result.replace(regex, this.values[placeholder])
      }
    })
    
    return result
  }

  show(promptObj, onApply, parentPanel = null, onPromptEdited = null) {
    if (!this.modal) {
      this.createModal()
    }
    this.currentPromptObj = promptObj;
    this.currentPrompt = promptObj.text;
    this.placeholders = this.extractPlaceholders(this.currentPrompt)
    this.values = {}
    this.onApply = onApply
    this.parentPanel = parentPanel;
    this.onPromptEdited = onPromptEdited;

    // Set title and show edit button if prompt has id
    this.updateTitle();
    const editBtn = this.modal.querySelector('.blitz-placeholder-edit-btn');
    if (editBtn) {
      editBtn.style.display = (promptObj && promptObj.id) ? 'inline-flex' : 'none';
    }

    this.updatePreview()
    this.updateInputFields()
    this.updateApplyButton()
    
    this.modal.classList.add('visible')
    this.isVisible = true
    
    // Focus the first input field
    setTimeout(() => {
      const firstInput = this.modal.querySelector('.blitz-placeholder-input')
      if (firstInput) firstInput.focus()
    }, 100)
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove('visible')
    }
    this.isVisible = false
  }

  destroy() {
    if (this.modal) {
      this.modal.remove()
      this.modal = null
    }
  }
}
