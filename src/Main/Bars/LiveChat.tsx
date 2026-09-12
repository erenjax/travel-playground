import { LiveList, shallow } from '@liveblocks/client'
import {
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useSelf,
  useStorage,
} from '@liveblocks/react/suspense'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  CHAT_TEXT_MAX,
  createJoinNotice,
  createUserMessage,
  mergeChatFeed,
} from '../../lib/chat'
import type { ChatItem } from '../../liveblocks/types'

type ChatToast = {
  id: string
  name: string
  color: string
  text: string
}

const TOAST_MS = 5000
const TITLE = 'Travel Playground'

function messageIds(items: readonly ChatItem[]) {
  return items.filter((item) => item.kind === 'user').map((item) => item.id)
}

function notifyDesktop(item: ChatItem) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(`${item.name} in Live chat`, { body: item.text })
  } catch {
    // Some browsers only allow this after a user gesture.
  }
}

export function LiveChat() {
  const self = useSelf((me) => me.presence.user, shallow)
  const stored = useStorage((root) => root.messages) ?? []
  const broadcast = useBroadcastEvent()
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [joins, setJoins] = useState<ChatItem[]>([])
  const [toasts, setToasts] = useState<ChatToast[]>([])
  const [unread, setUnread] = useState(0)
  const announced = useRef(false)
  const readIds = useRef(new Set<string>())
  const notifiedIds = useRef(new Set<string>())
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ensureMessages = useMutation(({ storage }) => {
    if (!storage.get('messages')) {
      storage.set('messages', new LiveList<ChatItem>([]))
    }
  }, [])

  const pushMessage = useMutation(({ storage }, item: ChatItem) => {
    let list = storage.get('messages')
    if (!list) {
      list = new LiveList<ChatItem>([])
      storage.set('messages', list)
    }
    list.push(item)
  }, [])

  useEffect(() => {
    ensureMessages()
  }, [ensureMessages])

  useEffect(() => {
    if (announced.current) return
    announced.current = true
    broadcast({ type: 'join', name: self.name })
  }, [broadcast, self.name])

  useEventListener(({ event }) => {
    if (event.type !== 'join' || event.name === self.name) return
    setJoins((current) => [...current, createJoinNotice({ name: event.name })])
  })

  const feed = useMemo(() => mergeChatFeed(stored, joins), [stored, joins])

  function markRead() {
    const ids = new Set(messageIds(feed))
    readIds.current = ids
    notifiedIds.current = new Set(ids)
    setToasts([])
    setUnread(0)
  }

  useEffect(() => {
    if (open) {
      markRead()
      const log = logRef.current
      if (log) log.scrollTop = log.scrollHeight
      return
    }

    const incoming = feed.filter(
      (item) => item.kind === 'user' && item.name !== self.name && !readIds.current.has(item.id),
    )
    setUnread(incoming.length)

    const fresh = incoming.filter((item) => !notifiedIds.current.has(item.id))
    if (fresh.length === 0) return

    for (const item of fresh) {
      notifiedIds.current.add(item.id)
      notifyDesktop(item)
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== item.id))
      }, TOAST_MS)
    }
    setToasts((current) => [
      ...current,
      ...fresh.map((item) => ({ id: item.id, name: item.name, color: item.color, text: item.text })),
    ].slice(-3))
  }, [feed, open, self.name])

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${TITLE}` : TITLE
    return () => {
      document.title = TITLE
    }
  }, [unread])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function minimize() {
    markRead()
    setOpen(false)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  function expand() {
    markRead()
    setOpen(true)
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const item = createUserMessage({ name: self.name, color: self.color, text: draft })
    if (!item) return
    pushMessage(item)
    setDraft('')
  }

  function onComposeKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
    if (event.key === 'Escape') minimize()
  }

  if (!open) {
    return (
      <div className="live-chat-dock">
        {toasts.length > 0 && (
          <div className="live-chat-toasts" aria-live="assertive" aria-relevant="additions">
            {toasts.map((toast) => (
              <button
                key={toast.id}
                type="button"
                className="live-chat-toast"
                onClick={expand}
              >
                <span className="live-chat-toast-name" style={{ color: toast.color }}>
                  {toast.name}
                </span>
                <span className="live-chat-toast-text">{toast.text}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={unread > 0 ? 'live-chat-chip live-chat-chip-alert' : 'live-chat-chip'}
          onClick={expand}
          aria-expanded={false}
          aria-label={unread > 0 ? `Live chat, ${unread} unread` : 'Live chat'}
        >
          <span className="live-chat-dot" aria-hidden="true" />
          Live chat
          {unread > 0 && (
            <span className="live-chat-unread">{unread} new</span>
          )}
        </button>
      </div>
    )
  }

  return (
    <section className="live-chat" aria-label="Live chat">
      <header className="live-chat-header">
        <h2 className="live-chat-title">Live chat</h2>
        <button
          type="button"
          className="live-chat-minimize"
          onClick={minimize}
          aria-label="Minimize live chat"
        >
          ×
        </button>
      </header>

      <div className="live-chat-log" ref={logRef} role="log" aria-live="polite">
        {feed.length === 0 && (
          <p className="live-chat-empty">Drop a note for anyone on this trip.</p>
        )}
        {feed.map((item) =>
          item.kind === 'join' ? (
            <p className="live-chat-join" key={item.id}>
              {item.text}
            </p>
          ) : (
            <article className="live-chat-user" key={item.id}>
              <span className="live-chat-name" style={{ color: item.color }}>
                {item.name}
              </span>
              <p className="live-chat-text">{item.text}</p>
            </article>
          ),
        )}
      </div>

      <form className="live-chat-compose" onSubmit={submit}>
        <input
          ref={inputRef}
          className="live-chat-input"
          value={draft}
          maxLength={CHAT_TEXT_MAX}
          placeholder="Message the group"
          aria-label="Message the group"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onComposeKey}
        />
        <button type="submit" className="live-chat-send" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}
