const STORAGE_KEY = 'blitzPrompts.data.v1'

const emptyData = {
  version: 1,
  prompts: [],
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ensureChromeStorage() {
  if (!chrome?.storage?.local) {
    throw new Error('Chrome local storage is unavailable.')
  }
  return chrome.storage.local
}

async function readData() {
  const storage = ensureChromeStorage()
  const result = await storage.get(STORAGE_KEY)
  const raw = result?.[STORAGE_KEY]

  if (!raw || typeof raw !== 'object') {
    return { ...emptyData, prompts: [] }
  }

  return {
    version: 1,
    prompts: Array.isArray(raw.prompts) ? raw.prompts.map(normalizePrompt) : [],
  }
}

async function writeData(data) {
  const storage = ensureChromeStorage()
  await storage.set({
    [STORAGE_KEY]: {
      version: 1,
      prompts: data.prompts.map(normalizePrompt),
    },
  })
}

function validatePromptContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Prompt content is required')
  }
  if (content.length > 50000) {
    throw new Error('Prompt content must be under 50000 characters')
  }
  return content
}

function validatePromptTitle(title) {
  if (!title || typeof title !== 'string') return ''
  const trimmed = title.trim()
  if (trimmed.length > 200) {
    throw new Error('Title must be under 200 characters')
  }
  return trimmed
}

function requireId(id, label) {
  if (!id || typeof id !== 'string') {
    throw new Error(`${label} is required`)
  }
  return id
}

function normalizePrompt(prompt) {
  const content = prompt.content ?? prompt.text ?? ''
  return {
    id: prompt.id,
    title: prompt.title || '',
    content,
    text: content,
    order_index: Number.isFinite(prompt.order_index) ? prompt.order_index : 0,
    created_at: prompt.created_at,
    updated_at: prompt.updated_at,
  }
}

function sortByOrder(a, b) {
  return (a.order_index || 0) - (b.order_index || 0)
}

export async function getPrompts() {
  const data = await readData()
  return data.prompts.map(normalizePrompt).sort(sortByOrder)
}

export async function createPrompt(_scope, title, text) {
  const promptTitle = validatePromptTitle(title)
  const content = validatePromptContent(text)
  const data = await readData()

  const nextOrder = data.prompts
    .reduce((max, prompt) => Math.max(max, prompt.order_index || 0), -1) + 1
  const timestamp = nowIso()
  const prompt = normalizePrompt({
    id: makeId(),
    title: promptTitle,
    content,
    order_index: nextOrder,
    created_at: timestamp,
    updated_at: timestamp,
  })

  data.prompts.push(prompt)
  await writeData(data)
  return prompt
}

export async function updatePrompt(id, title, text) {
  const promptId = requireId(id, 'Prompt ID')
  const promptTitle = validatePromptTitle(title)
  const content = validatePromptContent(text)
  const data = await readData()
  const index = data.prompts.findIndex((prompt) => prompt.id === promptId)

  if (index === -1) {
    throw new Error('Prompt not found')
  }

  data.prompts[index] = normalizePrompt({
    ...data.prompts[index],
    title: promptTitle,
    content,
    updated_at: nowIso(),
  })

  await writeData(data)
  return data.prompts[index]
}

export async function deletePrompt(id) {
  const promptId = requireId(id, 'Prompt ID')
  const data = await readData()
  data.prompts = data.prompts.filter((prompt) => prompt.id !== promptId)
  await writeData(data)
  return true
}

export async function exportPrompts() {
  const prompts = await getPrompts()
  return JSON.stringify(
    {
      prompts: prompts.map((p) => ({
        title: p.title || '',
        content: p.content,
      })),
    },
    null,
    2,
  )
}

/**
 * Import prompts from a JSON string. Accepts either the export shape
 * ({ prompts: [...] }) or a bare array of prompts. Imported prompts are
 * appended after any existing prompts (non-destructive).
 * @param {string} jsonText
 * @returns {Promise<{ imported: number, total: number }>}
 */
export async function importPrompts(jsonText) {
  if (!jsonText || typeof jsonText !== 'string' || !jsonText.trim()) {
    throw new Error('Paste some JSON to import.')
  }

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('That is not valid JSON.')
  }

  const incoming = Array.isArray(parsed) ? parsed : parsed?.prompts
  if (!Array.isArray(incoming)) {
    throw new Error('JSON must be an array of prompts or an object with a "prompts" array.')
  }

  const data = await readData()
  let nextOrder = data.prompts
    .reduce((max, prompt) => Math.max(max, prompt.order_index || 0), -1) + 1

  let imported = 0
  for (const item of incoming) {
    if (!item || typeof item !== 'object') continue
    const rawContent = item.content ?? item.text
    let content
    try {
      content = validatePromptContent(rawContent)
    } catch {
      continue // skip entries without valid content
    }
    const title = validatePromptTitle(item.title)
    const timestamp = nowIso()
    data.prompts.push(normalizePrompt({
      id: makeId(),
      title,
      content,
      order_index: nextOrder++,
      created_at: timestamp,
      updated_at: timestamp,
    }))
    imported++
  }

  if (imported === 0) {
    throw new Error('No valid prompts found in that JSON.')
  }

  await writeData(data)
  return { imported, total: data.prompts.length }
}

export async function updatePromptOrder(prompts) {
  const data = await readData()
  const orderById = new Map(prompts.map((prompt, index) => [prompt.id, index]))

  data.prompts = data.prompts.map((prompt) => (
    orderById.has(prompt.id)
      ? normalizePrompt({ ...prompt, order_index: orderById.get(prompt.id), updated_at: nowIso() })
      : prompt
  ))

  await writeData(data)
  return true
}
