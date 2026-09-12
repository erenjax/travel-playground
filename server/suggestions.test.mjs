import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { suggestionsPlugin } from './suggestions.ts'
import { parseSuggestions, suggestionContent } from '../src/Main/suggestions.ts'

const place = { name: 'Example', address: 'Kyoto, Japan', description: 'A local place', cuisine: 'Japanese', website: 'https://example.com' }

async function request(body, key = 'test-key') {
  let handler
  suggestionsPlugin(key, 'test-model').configureServer({ middlewares: { use(value) { handler = value } } })
  const req = Readable.from([JSON.stringify(body)])
  req.url = '/api/suggestions'
  req.method = 'POST'
  req.headers = { host: 'localhost' }
  let status
  let result
  await handler(req, {
    writeHead(value) { status = value },
    end(value) { result = JSON.parse(value) },
  }, () => assert.fail('Endpoint was skipped'))
  return { status, result }
}

test('grounded results become the matching card type without invented booking data', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(url, 'https://api.x.ai/v1/responses')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.equal(body.text.format.type, 'json_schema')
    assert.equal(body.text.format.schema.properties.suggestions.maxItems, 3)
    assert.deepEqual(body.tools, [{ type: 'web_search' }])
    return new Response(JSON.stringify({ status: 'completed', output: [{
      type: 'web_search_call',
    }, {
      type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ suggestions: [place] }),
        annotations: [{ type: 'url_citation', url: place.website, title: 'Official website' }],
      }],
    }] }))
  })
  for (const [category, tag] of [['Hotels', 'HotelCard'], ['Attractions', 'AttractionCard'], ['Food', 'FoodCard']]) {
    const { status, result } = await request({ category, location: 'Kyoto' })
    assert.equal(status, 200)
    assert.equal(result.sources.length, 1)
    const content = suggestionContent(category, result.suggestions[0])
    assert.equal(content._tag, tag)
    assert.equal(content.data.name, place.name)
    assert.equal(content.data.location.label, place.address)
    assert.equal(content.data.price, undefined)
    assert.equal(content.data.checkIn, undefined)
  }
})

test('invalid categories and locations do not call Grok', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected API request'))
  assert.equal((await request({ category: 'Flights', location: 'Kyoto' })).status, 400)
  assert.equal((await request({ category: 'Food', location: ' ' })).status, 400)
  assert.equal((await request({ category: 'Food', location: 'Kyoto' }, '')).status, 503)
})

test('quota and malformed responses produce retryable errors', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 429 }))
  assert.equal((await request({ category: 'Food', location: 'Kyoto' })).status, 429)
  mock.mock.mockImplementation(async () => new Response('{}'))
  assert.equal((await request({ category: 'Food', location: 'Kyoto' })).status, 502)
})

test('untrusted suggestion data is validated and unsafe links removed', () => {
  assert.equal(parseSuggestions([{ ...place, website: 'javascript:alert(1)' }])[0].website, '')
  assert.throws(() => parseSuggestions([{ ...place, name: 42 }]))
  assert.throws(() => parseSuggestions([{ ...place, address: '' }]))
})

test('depleted credit balance is distinguished from a rate limit', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: { message: 'Your team has exhausted its credits.' },
  }), { status: 429 }))
  const { status, result } = await request({ category: 'Food', location: 'Kyoto' })
  assert.equal(status, 429)
  assert.match(result.error, /billing or credit limit/)
  assert.match(result.error, /xAI console/)
})

test('only three option cards are accepted even if the provider returns more', () => {
  const results = parseSuggestions(Array.from({ length: 6 }, (_, index) => ({ ...place, name: `Place ${index + 1}` })))
  assert.equal(results.length, 3)
  assert.deepEqual(results.map((item) => item.name), ['Place 1', 'Place 2', 'Place 3'])
})
