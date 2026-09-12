import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { Suggestion } from '../src/Main/suggestions.ts'

function publicAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23]/.test(address)
  const [a, b] = address.split('.').map(Number)
  return isIP(address) === 4 && a !== 0 && a !== 10 && a !== 127 &&
    !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && b === 168) && !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 198 && (b === 18 || b === 19)) && a < 224
}

async function publicUrl(value: string): Promise<URL> {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Unsupported website')
  const addresses = await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Non-public website')
  return url
}

function decodeAttribute(value: string) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
}

export function featuredImage(html: string, website: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes: Record<string, string> = {}
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes[match[1].toLowerCase()] = decodeAttribute(match[2] ?? match[3] ?? match[4])
    }
    const name = (attributes.property || attributes.name || '').toLowerCase()
    if (!['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(name) || !attributes.content) continue
    try {
      const image = new URL(attributes.content, website)
      if (image.protocol === 'https:' && !image.username && !image.password) return image.href
    } catch { /* Try the next image tag. */ }
  }
  return ''
}

export async function addWebsiteImage(suggestion: Suggestion): Promise<Suggestion> {
  if (suggestion.imageUrl || !suggestion.website) return suggestion
  try {
    let website = suggestion.website
    const signal = AbortSignal.timeout(5000)
    for (let redirects = 0; redirects < 4; redirects++) {
      const url = await publicUrl(website)
      const response = await fetch(url, { redirect: 'manual', signal, headers: { Accept: 'text/html' } })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location) return suggestion
        website = new URL(location, url).href
        continue
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
        await response.body?.cancel()
        return suggestion
      }
      const reader = response.body?.getReader()
      if (!reader) return suggestion
      const decoder = new TextDecoder()
      let html = ''
      let bytes = 0
      try {
        while (bytes < 512_000) {
          const { value, done } = await reader.read()
          if (done) break
          bytes += value.byteLength
          html += decoder.decode(value, { stream: true })
          if (/<\/head>/i.test(html)) break
        }
      } finally { await reader.cancel() }
      const imageUrl = featuredImage(html, website)
      return imageUrl ? { ...suggestion, imageUrl, imageSourceUrl: website } : suggestion
    }
  } catch { /* A website without an accessible photo should not block the cards. */ }
  return suggestion
}
