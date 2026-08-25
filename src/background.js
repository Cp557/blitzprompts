import { createClient } from '@libsql/client/web'

const STORAGE_KEY = 'blitzPrompts.data.v1'
const PROVIDER_KEY = 'blitzPrompts.storageProvider.v1'
const SYNC_STATE_KEY = 'blitzPrompts.tursoSync.v1'
const REMOTE_RECORD_ID = 'default'

const databaseUrl = import.meta.env.VITE_TURSO_DATABASE_URL?.trim() || ''
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN?.trim() || ''

let client
let schemaReady

function emptyData() {
  return { version: 1, prompts: [] }
}

function normalizeData(value) {
  if (!value || typeof value !== 'object') return emptyData()
  return {
    version: 1,
    prompts: Array.isArray(value.prompts) ? value.prompts : [],
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function isTursoConfigured() {
  return Boolean(databaseUrl && authToken)
}

function getClient() {
  if (!isTursoConfigured()) {
    throw new Error('Turso is not configured. Add its URL and token to .env.local, then rebuild.')
  }

  if (!client) {
    client = createClient({ url: databaseUrl, authToken })
  }
  return client
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getClient().execute(`
      CREATE TABLE IF NOT EXISTS blitzprompts_data (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  await schemaReady
}

async function readLocalData() {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return normalizeData(result[STORAGE_KEY])
}

async function writeLocalData(data) {
  const normalized = normalizeData(data)
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized })
  return normalized
}

async function getProvider() {
  const result = await chrome.storage.local.get(PROVIDER_KEY)
  return result[PROVIDER_KEY] === 'turso' ? 'turso' : 'local'
}

async function setProvider(provider) {
  await chrome.storage.local.set({ [PROVIDER_KEY]: provider })
}

async function readSyncState() {
  const result = await chrome.storage.local.get(SYNC_STATE_KEY)
  return {
    dirty: Boolean(result[SYNC_STATE_KEY]?.dirty),
    lastSyncedAt: result[SYNC_STATE_KEY]?.lastSyncedAt || null,
    lastError: result[SYNC_STATE_KEY]?.lastError || null,
  }
}

async function writeSyncState(patch) {
  const current = await readSyncState()
  const next = { ...current, ...patch }
  await chrome.storage.local.set({ [SYNC_STATE_KEY]: next })
  return next
}

async function readRemoteData() {
  await ensureSchema()
  const result = await getClient().execute({
    sql: 'SELECT data FROM blitzprompts_data WHERE id = ?',
    args: [REMOTE_RECORD_ID],
  })

  if (result.rows.length === 0) return null

  const raw = result.rows[0].data
  if (typeof raw !== 'string') {
    throw new Error('Turso returned invalid prompt data.')
  }

  try {
    return normalizeData(JSON.parse(raw))
  } catch {
    throw new Error('The saved Turso prompt data is not valid JSON.')
  }
}

async function writeRemoteData(data) {
  const normalized = normalizeData(data)
  const timestamp = new Date().toISOString()
  await ensureSchema()
  await getClient().execute({
    sql: `
      INSERT INTO blitzprompts_data (id, version, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        data = excluded.data,
        updated_at = excluded.updated_at
    `,
    args: [REMOTE_RECORD_ID, normalized.version, JSON.stringify(normalized), timestamp],
  })
  await writeSyncState({ dirty: false, lastSyncedAt: timestamp, lastError: null })
  return normalized
}

async function recordSyncError(error) {
  await writeSyncState({ lastError: errorMessage(error) })
}

async function readData() {
  const localData = await readLocalData()
  if (await getProvider() !== 'turso') return localData

  const syncState = await readSyncState()
  try {
    if (syncState.dirty) {
      return await writeRemoteData(localData)
    }

    const remoteData = await readRemoteData()
    if (!remoteData) {
      return await writeRemoteData(localData)
    }

    await writeLocalData(remoteData)
    await writeSyncState({ lastSyncedAt: new Date().toISOString(), lastError: null })
    return remoteData
  } catch (error) {
    await recordSyncError(error)
    return localData
  }
}

async function writeData(data) {
  const localData = await writeLocalData(data)
  if (await getProvider() !== 'turso') return localData

  await writeSyncState({ dirty: true })
  try {
    return await writeRemoteData(localData)
  } catch (error) {
    await recordSyncError(error)
    return localData
  }
}

async function activateTurso(strategy) {
  if (!isTursoConfigured()) {
    throw new Error('Add Turso credentials to .env.local and rebuild first.')
  }

  await ensureSchema()
  if (strategy === 'remote') {
    const remoteData = await readRemoteData()
    if (!remoteData) {
      throw new Error('No prompts are saved in Turso yet. Upload local prompts instead.')
    }
    await writeLocalData(remoteData)
    await writeSyncState({ dirty: false, lastSyncedAt: new Date().toISOString(), lastError: null })
  } else {
    await writeRemoteData(await readLocalData())
  }

  await setProvider('turso')
  return getStatus()
}

async function syncNow() {
  if (await getProvider() !== 'turso') {
    throw new Error('Turso storage is not enabled.')
  }

  const localData = await readLocalData()
  const syncState = await readSyncState()
  if (syncState.dirty) {
    await writeRemoteData(localData)
  } else {
    const remoteData = await readRemoteData()
    if (remoteData) await writeLocalData(remoteData)
    else await writeRemoteData(localData)
  }
  return getStatus()
}

async function getStatus() {
  const syncState = await readSyncState()
  let databaseHost = null
  if (databaseUrl) {
    try {
      databaseHost = new URL(databaseUrl.replace(/^libsql:/, 'https:')).host
    } catch {
      databaseHost = 'Configured database'
    }
  }

  return {
    configured: isTursoConfigured(),
    provider: await getProvider(),
    databaseHost,
    ...syncState,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message?.type) {
      case 'blitz:read-data':
        return readData()
      case 'blitz:write-data':
        return writeData(message.data)
      case 'blitz:get-storage-status':
        return getStatus()
      case 'blitz:activate-turso':
        return activateTurso(message.strategy)
      case 'blitz:use-local-storage':
        await setProvider('local')
        return getStatus()
      case 'blitz:sync-now':
        return syncNow()
      default:
        throw new Error('Unknown BlitzPrompts message.')
    }
  }

  handle()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }))

  return true
})
