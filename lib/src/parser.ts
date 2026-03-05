import { Node } from './node'
import type { ParsedNode, TokenDef, TokenDescriptor, MatchContext, Position } from './types'

// ─── Pre-compiled token entry ───

interface TokenEntry {
  literal: string | null
  re: RegExp | null  // global flag, for regex tokens
  omit: boolean
  eject: boolean
  backslash: boolean
  owner: Node | null  // null = end token
  isEnd: boolean
}

interface DynamicTokenDef {
  tokenFn: (ctx: MatchContext) => string | RegExp
  omit: boolean
  eject: boolean
  backslash: boolean
  owner: Node | null
  isEnd: boolean
}

// ─── Per-Node search config (cached) ───

interface SearchConfig {
  statics: TokenEntry[]
  dynamics: DynamicTokenDef[]
  skipRe: RegExp | null
  badRe: RegExp | null
  hasOnContent: boolean
}

const configCache = new WeakMap<Node, SearchConfig>()

function getConfig(node: Node): SearchConfig {
  let c = configCache.get(node)
  if (c) return c

  const statics: TokenEntry[] = []
  const dynamics: DynamicTokenDef[] = []

  // End tokens first (higher priority at same position)
  for (const td of node.endTokens) {
    const d = norm(td)
    if (typeof d.token === 'function') {
      dynamics.push({ tokenFn: d.token, omit: d.omit ?? false, eject: d.eject ?? false, backslash: d.backslash ?? false, owner: null, isEnd: true })
    } else {
      statics.push(compile(d, null, true))
    }
  }

  // Children start tokens
  for (const child of node.recognizes) {
    for (const td of child.startTokens) {
      const d = norm(td)
      if (typeof d.token === 'function') {
        dynamics.push({ tokenFn: d.token, omit: d.omit ?? false, eject: d.eject ?? false, backslash: d.backslash ?? false, owner: child, isEnd: false })
      } else {
        statics.push(compile(d, child, false))
      }
    }
  }

  // Pre-compile skip/bad
  let skipRe: RegExp | null = null
  if (node.skip.length > 0) {
    const parts = node.skip.map(s => typeof s === 'string' ? esc(s) : (s as RegExp).source)
    skipRe = new RegExp(parts.length === 1 ? parts[0] : `(?:${parts.join('|')})`, 'g')
  }

  let badRe: RegExp | null = null
  if (node.bad.length > 0) {
    const parts = node.bad.map(s => typeof s === 'string' ? esc(s) : (s as RegExp).source)
    badRe = new RegExp(parts.length === 1 ? parts[0] : `(?:${parts.join('|')})`)
  }

  c = { statics, dynamics, skipRe, badRe, hasOnContent: !!node.hooks.onContent }
  configCache.set(node, c)
  return c
}

function compile(d: TokenDescriptor, owner: Node | null, isEnd: boolean): TokenEntry {
  const t = d.token
  if (typeof t === 'string') {
    return { literal: t, re: null, omit: d.omit ?? false, eject: d.eject ?? false, backslash: d.backslash ?? false, owner, isEnd }
  }
  const re = t as RegExp
  return { literal: null, re: new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), omit: d.omit ?? false, eject: d.eject ?? false, backslash: d.backslash ?? false, owner, isEnd }
}

function norm(td: TokenDef): TokenDescriptor {
  if (typeof td === 'string' || td instanceof RegExp || typeof td === 'function') return { token: td }
  return td
}

// ─── Match cache entry ───

interface Hit {
  index: number
  end: number
  text: string
  groups: Record<string, string> | undefined
  entry: TokenEntry
}

// ─── Public API ───

export function parse<T>(rootNode: Node<T>, source: string): ParsedNode<T> {
  const len = source.length
  let pos = 0, line = 1, col = 1

  // Match cache: per static TokenEntry → last found Hit or null (exhausted)
  const cache = new Map<TokenEntry, Hit | null>()

  const root: ParsedNode<T> = {
    node: rootNode,
    content: [],
    data: rootNode.initData(),
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 },
  }

  const stack: ParsedNode[] = []
  let cur: ParsedNode = root

  while (pos < len) {
    const hit = findClosest(cur, source, pos, len, cache)

    if (!hit) {
      appendContent(cur, source, pos, len)
      advanceTo(len)
      break
    }

    if (hit.index > pos) {
      appendContent(cur, source, pos, hit.index)
      advanceTo(hit.index)
    }

    if (hit.entry.isEnd) {
      if (!hit.entry.omit && !hit.entry.eject) appendRaw(cur, hit.text)

      const endOff = hit.entry.eject ? hit.index : hit.end
      advanceTo(endOff)
      cur.end = { offset: pos, line, column: col }

      // Auto-map named groups
      if (hit.groups) mapGroups(hit.groups, cur.data)

      // Auto-collect text content into data field
      if (cur.node.mapContent) {
        let text = ''
        for (const c of cur.content) {
          if (typeof c === 'string') text += c
        }
        ;(cur.data as any)[cur.node.mapContent] = text
      }

      if (cur.node.hooks.onClose) {
        cur.node.hooks.onClose(cur, hit.groups ? { text: hit.text, groups: hit.groups } : null)
      }

      if (stack.length === 0) break
      const parent = stack.pop()!
      parent.content.push(cur)
      parent.node.hooks.onChild?.(cur, parent)
      cur = parent
    } else {
      const childNode = hit.entry.owner!
      const startPos: Position = { offset: pos, line, column: col }
      const child: ParsedNode = {
        node: childNode,
        content: [],
        data: childNode.initData(),
        start: startPos,
        end: startPos,
        parent: cur,
      }

      if (hit.groups) mapGroups(hit.groups, child.data)

      if (childNode.hooks.onOpen) {
        const res = childNode.hooks.onOpen(child, { text: hit.text, groups: hit.groups })
        if (res === false) {
          appendRaw(cur, hit.text)
          advanceTo(hit.end)
          continue
        }
      }
      if (!hit.entry.omit && !hit.entry.eject) appendRaw(child, hit.text)

      const newPos = hit.entry.eject ? hit.index : hit.end
      advanceTo(newPos)
      stack.push(cur)
      cur = child
    }
  }

  // Unclosed nodes
  while (stack.length > 0) {
    if (!cur.node.eofClose) {
      throw new ParseError(`Unclosed node "${cur.node.name}" at ${line}:${col}`, source, pos)
    }
    cur.end = { offset: pos, line, column: col }
    if (cur.node.mapContent) {
      let text = ''
      for (const c of cur.content) {
        if (typeof c === 'string') text += c
      }
      ;(cur.data as any)[cur.node.mapContent] = text
    }
    cur.node.hooks.onClose?.(cur, null)
    const parent = stack.pop()!
    parent.content.push(cur)
    parent.node.hooks.onChild?.(cur, parent)
    cur = parent
  }

  cur.end = { offset: pos, line, column: col }

  // Run onClose/mapContent for the root node itself
  if (cur.node.mapContent) {
    let text = ''
    for (const c of cur.content) {
      if (typeof c === 'string') text += c
    }
    ;(cur.data as any)[cur.node.mapContent] = text
  }
  cur.node.hooks.onClose?.(cur, null)

  return root

  // ─── Inline helpers (close over pos/line/col) ───

  function advanceTo(to: number) {
    for (let i = pos; i < to; i++) {
      if (source.charCodeAt(i) === 10) { line++; col = 1 } else { col++ }
    }
    pos = to
  }

  function appendContent(node: ParsedNode, src: string, from: number, to: number) {
    if (from >= to) return
    const cfg = getConfig(node.node)
    let text = src.substring(from, to)

    if (cfg.skipRe) {
      cfg.skipRe.lastIndex = 0
      text = text.replace(cfg.skipRe, '')
    }
    if (cfg.badRe) {
      cfg.badRe.lastIndex = 0
      const m = cfg.badRe.exec(text)
      if (m) throw new ParseError(`Unexpected token "${m[0]}" in "${node.node.name}"`, src, from + m.index)
    }
    if (text.length > 0) appendRaw(node, text)
  }

  function appendRaw(node: ParsedNode, text: string) {
    if (node.node.hooks.onContent) {
      const r = node.node.hooks.onContent(text, node)
      if (typeof r === 'string') text = r
      if (text.length === 0) return
    }
    const c = node.content
    const last = c.length - 1
    if (last >= 0 && typeof c[last] === 'string') {
      c[last] = (c[last] as string) + text
    } else {
      c.push(text)
    }
  }
}

// ─── Match finding ───

function findClosest(
  cur: ParsedNode,
  source: string,
  pos: number,
  len: number,
  cache: Map<TokenEntry, Hit | null>,
): Hit | null {
  const cfg = getConfig(cur.node)
  let best: Hit | null = null

  // Static tokens with caching
  for (let i = 0, n = cfg.statics.length; i < n; i++) {
    const entry = cfg.statics[i]
    let hit = cache.get(entry)

    // Cache miss or stale
    if (hit === undefined || (hit !== null && hit.index < pos)) {
      hit = searchStatic(entry, source, pos, len)
      cache.set(entry, hit)
    }
    // Exhausted
    if (hit === null) continue

    if (!best || hit.index < best.index) {
      best = hit
      if (hit.index === pos) return best // can't beat position 0
    }
  }

  // Dynamic tokens (no caching — resolved per call)
  if (cfg.dynamics.length > 0) {
    const ctx: MatchContext = { node: cur, parent: cur.parent, source, pos }
    for (let i = 0, n = cfg.dynamics.length; i < n; i++) {
      const dyn = cfg.dynamics[i]
      const resolved = dyn.tokenFn(ctx)
      const hit = searchDynamic(resolved, dyn, source, pos, len)
      if (!hit) continue
      if (!best || hit.index < best.index) {
        best = hit
        if (hit.index === pos) return best
      }
    }
  }

  return best
}

function searchStatic(entry: TokenEntry, source: string, pos: number, _len: number): Hit | null {
  if (entry.literal !== null) {
    let idx = source.indexOf(entry.literal, pos)
    if (entry.backslash) {
      while (idx > 0 && source.charCodeAt(idx - 1) === 92) {
        idx = source.indexOf(entry.literal, idx + 1)
      }
    }
    if (idx === -1) return null
    return { index: idx, end: idx + entry.literal.length, text: entry.literal, groups: undefined, entry }
  }

  // Regex
  const re = entry.re!
  re.lastIndex = pos
  let m = re.exec(source)
  if (entry.backslash) {
    while (m && m.index > 0 && source.charCodeAt(m.index - 1) === 92) {
      re.lastIndex = m.index + 1
      m = re.exec(source)
    }
  }
  if (!m) return null
  return { index: m.index, end: m.index + m[0].length, text: m[0], groups: m.groups as Record<string, string> | undefined, entry }
}

function searchDynamic(
  resolved: string | RegExp,
  dyn: DynamicTokenDef,
  source: string,
  pos: number,
  _len: number,
): Hit | null {
  // Create a temporary entry-like for the hit
  const tmpEntry: TokenEntry = {
    literal: typeof resolved === 'string' ? resolved : null,
    re: typeof resolved === 'string' ? null : new RegExp(resolved.source, resolved.flags.includes('g') ? resolved.flags : resolved.flags + 'g'),
    omit: dyn.omit,
    eject: dyn.eject,
    backslash: dyn.backslash,
    owner: dyn.owner,
    isEnd: dyn.isEnd,
  }

  if (tmpEntry.literal !== null) {
    let idx = source.indexOf(tmpEntry.literal, pos)
    if (tmpEntry.backslash) {
      while (idx > 0 && source.charCodeAt(idx - 1) === 92) {
        idx = source.indexOf(tmpEntry.literal, idx + 1)
      }
    }
    if (idx === -1) return null
    return { index: idx, end: idx + tmpEntry.literal.length, text: tmpEntry.literal, groups: undefined, entry: tmpEntry }
  }

  const re = tmpEntry.re!
  re.lastIndex = pos
  let m = re.exec(source)
  if (tmpEntry.backslash) {
    while (m && m.index > 0 && source.charCodeAt(m.index - 1) === 92) {
      re.lastIndex = m.index + 1
      m = re.exec(source)
    }
  }
  if (!m) return null
  return { index: m.index, end: m.index + m[0].length, text: m[0], groups: m.groups as Record<string, string> | undefined, entry: tmpEntry }
}

// ─── Utilities ───

function mapGroups(groups: Record<string, string>, data: any) {
  for (const key in groups) {
    if (groups[key] !== undefined && key in data) {
      data[key] = groups[key]
    }
  }
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class ParseError extends Error {
  constructor(message: string, public source: string, public offset: number) {
    super(message)
    this.name = 'ParseError'
  }
}
