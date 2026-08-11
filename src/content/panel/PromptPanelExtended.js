import { createPrompt, updatePrompt, deletePrompt } from '../services/api.js'
import { SecurityUtils } from '../services/security.js'
import { PromptPanel } from './PromptPanel.js'

function isPanelOpen() {
  const panel = document.querySelector('.prompts-panel')
  return panel && panel.classList.contains('open')
}

export class PromptPanelExtended extends PromptPanel {
  constructor() {
    super()
    this.fillingPlaceholders = []
    this.fillingValues = {}
    this.currentFillingPrompt = null
    this.lastViewedPrompt = null
    this.currentEditingPrompt = null
    this.editPromptCallback = null
  }

  renderPrompts(prompts = this.currentPrompts) {
    const container = document.querySelector('.prompts-container')
    if (!container) return

    const addButton = document.querySelector('.add-button')
    if (addButton) {
      if (this.currentView === 'prompts' && isPanelOpen()) {
        const newAddButton = this.createAddPromptButton()
        addButton.parentNode.replaceChild(newAddButton, addButton)
        newAddButton.style.display = 'flex'
      } else {
        addButton.style.display = 'none'
      }
    }

    if (!prompts || prompts.length === 0) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;">
          <div style="color:#6b7280;font-size:16px;font-weight:500;">No prompts yet</div>
          <p style="color:#9ca3af;font-size:14px;margin-top:8px;">Add prompts to get started</p>
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
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
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

  renderFillingView(prompt) {
    this.updateHeader()

    const addButton = document.querySelector('.add-button')
    if (addButton) addButton.style.display = 'none'

    const container = document.querySelector('.prompts-container')
    if (!container) return

    this.currentFillingPrompt = prompt
    this.fillingValues = {}
    this.fillingPlaceholders = this.extractPlaceholders(prompt.text)

    container.innerHTML = `
      <div class="filling-view">
        <div class="filling-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="flex:1;font-weight:600;font-size:16px;color:#1e40af;white-space:normal;word-wrap:break-word;line-height:1.3;max-height:40px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${SecurityUtils.escapeHtml(prompt.title || 'Prompt')}</div>
          <button class="blitz-placeholder-edit-btn" title="Edit prompt" style="${prompt.id ? '' : 'display:none;'}margin-left:8px;background:none;border:none;cursor:pointer;padding:2px;border-radius:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>
        <div class="blitz-prompt-preview" style="margin-bottom:18px;"></div>
        <div class="blitz-placeholder-inputs" style="margin-bottom:18px;"></div>
        <div class="filling-actions" style="display:flex;justify-content:flex-end;gap:12px;">
          <button class="blitz-btn-apply">Apply</button>
        </div>
      </div>
    `

    this.updateFillingPreview()
    this.updateFillingInputs()
    this.updateFillingApplyButton()
    this.attachFillingHandlers()
  }

  extractPlaceholders(text = '') {
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

  updateFillingPreview() {
    const previewEl = document.querySelector('.blitz-prompt-preview')
    if (!previewEl || !this.currentFillingPrompt) return

    let previewHtml = SecurityUtils.escapeHtml(this.currentFillingPrompt.text)
    this.fillingPlaceholders.forEach(placeholder => {
      const replacement = this.fillingValues[placeholder]
        ? `<span class="filled">${SecurityUtils.escapeHtml(this.fillingValues[placeholder])}</span>`
        : `<span class="highlight">{{${SecurityUtils.escapeHtml(placeholder)}}}</span>`
      previewHtml = previewHtml.split(`{{${placeholder}}}`).join(replacement)
    })
    previewEl.innerHTML = previewHtml
  }

  updateFillingInputs() {
    const inputsContainer = document.querySelector('.blitz-placeholder-inputs')
    if (!inputsContainer) return

    inputsContainer.innerHTML = ''
    this.fillingPlaceholders.forEach(placeholder => {
      const inputGroup = document.createElement('div')
      inputGroup.className = 'blitz-placeholder-input-group'

      const label = document.createElement('label')
      label.className = 'blitz-placeholder-label'
      label.textContent = placeholder
      label.htmlFor = `blitz-placeholder-${placeholder}`

      const textarea = document.createElement('textarea')
      textarea.className = 'blitz-placeholder-input'
      textarea.id = `blitz-placeholder-${placeholder}`
      textarea.value = this.fillingValues[placeholder] || ''
      textarea.setAttribute('autocomplete', 'off')
      textarea.addEventListener('input', (event) => {
        this.fillingValues[placeholder] = event.target.value
        this.updateFillingPreview()
        this.updateFillingApplyButton()
      })

      inputGroup.appendChild(label)
      inputGroup.appendChild(textarea)
      inputsContainer.appendChild(inputGroup)
    })
  }

  updateFillingApplyButton() {
    const applyBtn = document.querySelector('.blitz-btn-apply')
    if (!applyBtn) return

    applyBtn.disabled = false
  }

  getFillingReplacedText() {
    if (!this.currentFillingPrompt) return ''

    let result = this.currentFillingPrompt.text
    this.fillingPlaceholders.forEach(placeholder => {
      if (this.fillingValues[placeholder]) {
        result = result.split(`{{${placeholder}}}`).join(this.fillingValues[placeholder])
      }
    })
    return result
  }

  attachFillingHandlers() {
    const applyBtn = document.querySelector('.blitz-btn-apply')
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.insertPromptToEditor(this.getFillingReplacedText())
        this.togglePanel()
      })
    }

    const editBtn = document.querySelector('.blitz-placeholder-edit-btn')
    if (editBtn && this.currentFillingPrompt?.id) {
      editBtn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.lastViewedPrompt = this.currentFillingPrompt
        this.currentView = 'editing'
        this.renderEditingView(this.currentFillingPrompt)
      })
    }
  }

  renderEditingView(prompt) {
    this.updateHeader()

    const addButton = document.querySelector('.add-button')
    if (addButton) addButton.style.display = 'none'

    const container = document.querySelector('.prompts-container')
    if (!container) return

    this.currentEditingPrompt = prompt

    container.innerHTML = `
      <div class="editing-view" style="padding:0;margin:0;">
        <div class="form-group" style="margin:0 0 12px 0;">
          <label class="form-label" style="display:block;margin:0 0 6px 0;font-weight:500;">Title</label>
          <input type="text" class="form-input" id="edit-prompt-title" placeholder="Enter title"
            value="${SecurityUtils.escapeHtml(prompt.title || '')}"
            style="width:100%;padding:8px;border:2px solid #bfdbfe;border-radius:6px;" autocomplete="off" />
        </div>
        <div class="form-group" style="margin:0 0 12px 0;">
          <label class="form-label" style="display:block;margin:0 0 6px 0;font-weight:500;">Prompt Text</label>
          <textarea class="form-textarea" id="edit-prompt-text" placeholder="Write your prompt here..."
            style="width:100%;min-height:200px;padding:8px;border:2px solid #bfdbfe;border-radius:6px;" autocomplete="off"
          >${SecurityUtils.escapeHtml(prompt.text || '')}</textarea>
        </div>
        <div class="form-error" style="color:#ef4444;margin:8px 0;display:none;"></div>
        <div class="editing-actions" style="display:flex;justify-content:space-between;margin-top:24px;">
          <div class="left-actions">
            <button class="btn-delete" style="background:none;border:none;color:#ef4444;padding:8px 16px;cursor:pointer;border-radius:6px;font-weight:500;font-size:14px;">
              Delete
            </button>
          </div>
          <button class="btn-update-prompt"
            style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:500;cursor:pointer;font-size:14px;"
            ${!prompt.text?.trim() ? 'disabled' : ''}>
            Update
          </button>
        </div>
      </div>
    `

    this.attachEditingHandlers()
  }

  checkUnsavedEditChanges() {
    if (!this.currentEditingPrompt) return false

    const titleInput = document.querySelector('#edit-prompt-title')
    const textArea = document.querySelector('#edit-prompt-text')
    if (!titleInput || !textArea) return false

    return titleInput.value !== (this.currentEditingPrompt.title || '') ||
      textArea.value !== (this.currentEditingPrompt.text || '')
  }

  showConfirmationDialog(message, onConfirm) {
    const existingDialog = document.querySelector('.blitz-confirmation-dialog')
    if (existingDialog) existingDialog.remove()

    const dialog = document.createElement('div')
    dialog.className = 'blitz-confirmation-dialog'
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <span style="font-weight:600;">BlitzPrompts</span>
        </div>
        <div class="dialog-message">${SecurityUtils.escapeHtml(message)}</div>
        <div class="dialog-buttons">
          <button class="dialog-btn dialog-cancel">Cancel</button>
          <button class="dialog-btn dialog-confirm">OK</button>
        </div>
      </div>
    `

    const style = document.createElement('style')
    style.textContent = `
      .blitz-confirmation-dialog {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .dialog-content {
        background: white;
        border-radius: 12px;
        padding: 20px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        color: #1e40af;
      }
      .dialog-message {
        margin-bottom: 20px;
        color: #374151;
        text-align: center;
      }
      .dialog-buttons {
        display: flex;
        justify-content: center;
        gap: 12px;
      }
      .dialog-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      .dialog-cancel {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        color: #4b5563;
      }
      .dialog-confirm {
        background: #3b82f6;
        border: none;
        color: white;
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(dialog)

    dialog.querySelector('.dialog-cancel').addEventListener('click', () => dialog.remove())
    dialog.querySelector('.dialog-confirm').addEventListener('click', () => {
      dialog.remove()
      if (onConfirm) onConfirm()
    })
  }

  attachEditingHandlers() {
    const deleteBtn = document.querySelector('.btn-delete')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.showConfirmationDialog('Are you sure you want to delete this prompt?', async () => {
          await this.handleDeletePrompt(this.currentEditingPrompt.id)
        })
      })
    }

    const updateBtn = document.querySelector('.btn-update-prompt')
    const titleInput = document.querySelector('#edit-prompt-title')
    const textArea = document.querySelector('#edit-prompt-text')

    if (updateBtn && titleInput && textArea) {
      const updateButtonState = () => {
        updateBtn.disabled = !textArea.value.trim()
      }

      titleInput.addEventListener('input', updateButtonState)
      textArea.addEventListener('input', updateButtonState)
      updateBtn.addEventListener('click', async () => {
        await this.handleUpdatePrompt(
          this.currentEditingPrompt.id,
          titleInput.value,
          textArea.value
        )
      })
    }
  }

  async handleUpdatePrompt(promptId, title, text) {
    if (!text.trim()) return

    const errorEl = document.querySelector('.form-error')
    const updateBtn = document.querySelector('.btn-update-prompt')
    if (updateBtn) {
      updateBtn.textContent = 'Updating...'
      updateBtn.disabled = true
    }

    try {
      const updatedPrompt = await updatePrompt(promptId, title, text)
      const index = this.currentPrompts.findIndex(prompt => prompt.id == promptId)
      if (index >= 0) {
        this.currentPrompts[index] = { ...this.currentPrompts[index], ...updatedPrompt }
      }

      this.currentEditingPrompt = null
      if (this.editPromptCallback) {
        this.editPromptCallback(updatedPrompt, false)
        this.editPromptCallback = null
      }

      this.currentView = 'prompts'
      this.updateHeader()
      this.renderPrompts()
      this.showToast('Prompt updated successfully!', 'success')
    } catch (error) {
      console.error('[Extension] update prompt error', error)
      if (errorEl) {
        errorEl.textContent = error.message
        errorEl.style.display = 'block'
      }
    } finally {
      if (updateBtn) {
        updateBtn.textContent = 'Update'
        updateBtn.disabled = false
      }
    }
  }

  async handleDeletePrompt(promptId) {
    const errorEl = document.querySelector('.form-error')

    try {
      await deletePrompt(promptId)
      this.currentPrompts = this.currentPrompts.filter(prompt => prompt.id != promptId)

      this.currentEditingPrompt = null
      if (this.editPromptCallback) {
        this.editPromptCallback(null, true)
        this.editPromptCallback = null
      }

      this.currentView = 'prompts'
      this.updateHeader()
      this.renderPrompts()
      this.showToast('Prompt deleted successfully!', 'success')
    } catch (error) {
      console.error('[Extension] Failed to delete prompt:', error)
      if (errorEl) {
        errorEl.textContent = error.message || 'Failed to delete prompt'
        errorEl.style.display = 'block'
      }
    }
  }

  renderCreationView() {
    this.currentView = 'creation'
    this.updateHeader()

    const addButton = document.querySelector('.add-button')
    if (addButton) addButton.style.display = 'none'

    const container = document.querySelector('.prompts-container')
    if (!container) return

    container.innerHTML = `
      <div class="editing-view" style="padding:0;margin:0;">
        <div class="form-group" style="margin:0 0 12px 0;">
          <label class="form-label" style="display:block;margin:0 0 6px 0;font-weight:500;">Title</label>
          <input type="text" class="form-input" id="create-prompt-title" placeholder="Enter title" value=""
            style="width:100%;padding:8px;border:2px solid #bfdbfe;border-radius:6px;" autocomplete="off" />
        </div>
        <div class="form-group" style="margin:0 0 12px 0;">
          <label class="form-label" style="display:block;margin:0 0 6px 0;font-weight:500;">Prompt Text</label>
          <textarea class="form-textarea" id="create-prompt-text" placeholder="Write your prompt here..."
            style="width:100%;min-height:200px;padding:8px;border:2px solid #bfdbfe;border-radius:6px;" autocomplete="off"
          ></textarea>
        </div>
        <div class="form-error" style="color:#ef4444;margin:8px 0;display:none;"></div>
        <div class="editing-actions" style="display:flex;justify-content:flex-end;margin-top:24px;">
          <button class="btn-create-prompt"
            style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:500;cursor:pointer;font-size:14px;"
            disabled>
            Create Prompt
          </button>
        </div>
      </div>
    `

    this.attachCreationHandlers()
  }

  checkUnsavedCreationChanges() {
    const titleInput = document.querySelector('#create-prompt-title')
    const textArea = document.querySelector('#create-prompt-text')
    if (!titleInput || !textArea) return false
    return titleInput.value.trim() !== '' || textArea.value.trim() !== ''
  }

  attachCreationHandlers() {
    const createBtn = document.querySelector('.btn-create-prompt')
    const titleInput = document.querySelector('#create-prompt-title')
    const textArea = document.querySelector('#create-prompt-text')
    if (!createBtn || !titleInput || !textArea) return

    const updateButtonState = () => {
      const isEmpty = !titleInput.value.trim() || !textArea.value.trim()
      createBtn.disabled = isEmpty
      createBtn.style.opacity = isEmpty ? '0.5' : '1'
      createBtn.style.cursor = isEmpty ? 'not-allowed' : 'pointer'
    }

    updateButtonState()
    titleInput.addEventListener('input', updateButtonState)
    textArea.addEventListener('input', updateButtonState)
    createBtn.addEventListener('click', async () => {
      await this.handleCreateNewPrompt(titleInput.value, textArea.value)
    })
  }

  async handleCreateNewPrompt(title, text) {
    if (!title.trim() || !text.trim()) return

    const createBtn = document.querySelector('.btn-create-prompt')
    const errorEl = document.querySelector('.form-error')
    if (createBtn) {
      createBtn.textContent = 'Creating...'
      createBtn.disabled = true
    }
    if (errorEl) errorEl.style.display = 'none'

    try {
      const newPrompt = await createPrompt(null, title, text)
      this.currentPrompts = [...this.currentPrompts, newPrompt]
      this.currentView = 'prompts'
      this.updateHeader()
      this.renderPrompts()
      this.showToast('Prompt created successfully!', 'success')
    } catch (error) {
      console.error('[Extension] create prompt error', error)
      if (errorEl) {
        errorEl.textContent = error.message
        errorEl.style.display = 'block'
      }
    } finally {
      if (createBtn) {
        createBtn.textContent = 'Create Prompt'
        createBtn.disabled = false
      }
    }
  }

}
