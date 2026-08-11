const platforms = [
  { name: 'ChatGPT', url: 'https://chatgpt.com', logo: '/chatgpt.png' },
  { name: 'Claude', url: 'https://claude.ai/new', logo: '/claude.png' },
  { name: 'Gemini', url: 'https://gemini.google.com/app', logo: '/gemini.png' },
  { name: 'Grok', url: 'https://grok.com', logo: '/grok.png' },
]

function openPlatform(url: string) {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function Popup() {
  return (
    <main className="w-[284px] bg-[#f6f7f9] p-3 text-gray-950">
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
    </main>
  )
}

export default Popup
