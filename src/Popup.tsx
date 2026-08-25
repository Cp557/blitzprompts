import { useEffect, useState } from 'react'

const platforms = [
  { name: 'ChatGPT', url: 'https://chatgpt.com', logo: '/chatgpt.png' },
  { name: 'Claude', url: 'https://claude.ai/new', logo: '/claude.png' },
  { name: 'Gemini', url: 'https://gemini.google.com/app', logo: '/gemini.png' },
  { name: 'Grok', url: 'https://grok.com', logo: '/grok.png' },
]

type StorageStatus = {
  configured: boolean
  provider: 'local' | 'turso'
  databaseHost: string | null
  dirty: boolean
  lastSyncedAt: string | null
  lastError: string | null
}

async function sendCommand(type: string, extra: Record<string, unknown> = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...extra })
  if (!response?.ok) {
    throw new Error(response?.error || 'Storage request failed.')
  }
  return response.data as StorageStatus
}

function openPlatform(url: string) {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function Popup() {
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    sendCommand('blitz:get-storage-status')
      .then(setStorage)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : 'Could not load storage settings.')
      })
  }, [])

  async function runStorageAction(type: string, extra: Record<string, unknown>, success: string) {
    setBusy(true)
    setMessage(null)
    try {
      setStorage(await sendCommand(type, extra))
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Storage request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="w-[320px] bg-[#f6f7f9] p-3 text-gray-950">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-2 gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              type="button"
              onClick={() => openPlatform(platform.url)}
              className="flex h-14 w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              aria-label={`Open ${platform.name}`}
              title={platform.name}
            >
              <img src={platform.logo} alt="" className="h-7 w-7 object-contain" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-sm font-semibold">Prompt storage</h2>
            <p className="m-0 mt-0.5 text-xs text-gray-500">
              {storage?.provider === 'turso' ? 'Turso + local mirror' : 'This browser only'}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            storage?.provider === 'turso'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {storage?.provider === 'turso' ? 'Turso' : 'Local'}
          </span>
        </div>

        {storage?.configured && storage.databaseHost && (
          <p className="mt-3 truncate rounded-lg bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600" title={storage.databaseHost}>
            {storage.databaseHost}
          </p>
        )}

        {!storage?.configured && (
          <p className="mt-3 text-xs leading-5 text-amber-700">
            Add Turso credentials to <code>.env.local</code> and rebuild to enable cloud storage.
          </p>
        )}

        {storage?.configured && storage.provider === 'local' && (
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => runStorageAction(
                'blitz:activate-turso',
                { strategy: 'upload' },
                'Local prompts uploaded. Turso storage is active.',
              )}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              Upload local prompts and use Turso
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runStorageAction(
                'blitz:activate-turso',
                { strategy: 'remote' },
                'Turso prompts restored. Turso storage is active.',
              )}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
            >
              Restore existing prompts from Turso
            </button>
          </div>
        )}

        {storage?.provider === 'turso' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => runStorageAction('blitz:sync-now', {}, 'Turso sync complete.')}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              Sync now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runStorageAction('blitz:use-local-storage', {}, 'Using local storage.')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
            >
              Use local
            </button>
          </div>
        )}

        {storage?.provider === 'turso' && storage.lastSyncedAt && (
          <p className="mb-0 mt-2 text-[11px] text-gray-500">
            Last synced {new Date(storage.lastSyncedAt).toLocaleString()}
            {storage.dirty ? ' · local changes pending' : ''}
          </p>
        )}

        {(message || storage?.lastError) && (
          <p className={`mb-0 mt-2 text-xs leading-5 ${storage?.lastError ? 'text-red-600' : 'text-gray-600'}`}>
            {message || storage?.lastError}
          </p>
        )}
      </section>
    </main>
  )
}

export default Popup
