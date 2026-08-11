export function mergePromptWithEditorText(existingText = '', promptText = '') {
  const existing = String(existingText ?? '').trim()
  const prompt = String(promptText ?? '').trim()

  if (!existing) return prompt
  if (!prompt) return existing

  if (prompt.includes('{{text}}')) {
    return prompt.replace(/\{\{text\}\}/g, existing)
  }

  return `${existing}\n\n${prompt}`
}
