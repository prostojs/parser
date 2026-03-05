import type { NodeOptions, NodeHooks, TokenDef, ParsedNode, Token } from './types'

/**
 * Node defines a recognizable pattern in the source text.
 * It has start/end tokens, recognized children, and hooks for data extraction.
 */
export class Node<T = any> {
  name: string
  startTokens: TokenDef[]
  endTokens: TokenDef[]
  recognizes: Node<any>[]
  skip: Token[]
  bad: Token[]
  eofClose: boolean
  hooks: NodeHooks<T>
  mapContent?: string

  // Data cloning infrastructure
  private _cloneData: (() => T) | undefined

  constructor(options: NodeOptions<T> = {}) {
    this.name = options.name ?? ''
    this.startTokens = normalizeTokenDefs(options.start)
    this.endTokens = normalizeTokenDefs(options.end)
    this.recognizes = options.recognizes ?? []
    this.skip = normalizeTokens(options.skip)
    this.bad = normalizeTokens(options.bad)
    this.eofClose = options.eofClose ?? false
    this.hooks = { ...options.hooks }
    this.mapContent = options.mapContent

    // Build data cloner
    if (options.data !== undefined) {
      if (typeof options.data === 'function') {
        this._cloneData = options.data as () => T
      } else {
        // Plain object template — build an optimized cloner
        const template = options.data as Record<string, any>
        const objectKeys: string[] = []
        for (const key in template) {
          const v = template[key]
          if (v !== null && typeof v === 'object') {
            objectKeys.push(key)
          }
        }
        if (objectKeys.length === 0) {
          // All primitives — simple spread
          this._cloneData = () => ({ ...template }) as T
        } else {
          // Has object/array values — deep clone those
          this._cloneData = () => {
            const clone: any = { ...template }
            for (let i = 0; i < objectKeys.length; i++) {
              const v = template[objectKeys[i]]
              clone[objectKeys[i]] = Array.isArray(v) ? [...v] : { ...v }
            }
            return clone as T
          }
        }
      }
    }
  }

  /** Create a fresh data instance */
  initData(): T {
    return this._cloneData ? this._cloneData() : ({} as T)
  }

  // --- Fluent builder API ---

  /** Set start token(s) */
  starts(token: TokenDef | TokenDef[]): this {
    this.startTokens = normalizeTokenDefs(token)
    return this
  }

  /** Set end token(s) */
  ends(token: TokenDef | TokenDef[]): this {
    this.endTokens = normalizeTokenDefs(token)
    return this
  }

  /** Add recognized child nodes */
  recognize(...nodes: Node<any>[]): this {
    this.recognizes.push(...nodes)
    return this
  }

  /** Set data initializer (plain object template or factory function) */
  data(init: T | (() => T)): this {
    if (typeof init === 'function') {
      this._cloneData = init as () => T
    } else {
      const template = init as Record<string, any>
      const objectKeys: string[] = []
      for (const key in template) {
        const v = template[key]
        if (v !== null && typeof v === 'object') {
          objectKeys.push(key)
        }
      }
      if (objectKeys.length === 0) {
        this._cloneData = () => ({ ...template }) as T
      } else {
        this._cloneData = () => {
          const clone: any = { ...template }
          for (let i = 0; i < objectKeys.length; i++) {
            const v = template[objectKeys[i]]
            clone[objectKeys[i]] = Array.isArray(v) ? [...v] : { ...v }
          }
          return clone as T
        }
      }
    }
    return this
  }

  /** Set onOpen hook */
  onOpen(fn: NonNullable<NodeHooks<T>['onOpen']>): this {
    this.hooks.onOpen = fn
    return this
  }

  /** Set onClose hook */
  onClose(fn: NonNullable<NodeHooks<T>['onClose']>): this {
    this.hooks.onClose = fn
    return this
  }

  /** Set onContent hook */
  onContent(fn: NonNullable<NodeHooks<T>['onContent']>): this {
    this.hooks.onContent = fn
    return this
  }

  /** Set onChild hook */
  onChild(fn: NonNullable<NodeHooks<T>['onChild']>): this {
    this.hooks.onChild = fn
    return this
  }

  /** Parse a source string using this node as root */
  parse(source: string): ParsedNode<T> {
    // Import here to avoid circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parse } = require('./parser')
    return parse(this, source) as ParsedNode<T>
  }
}

function normalizeTokenDefs(input?: TokenDef | TokenDef[]): TokenDef[] {
  if (input == null) return []
  return Array.isArray(input) ? input : [input]
}

function normalizeTokens(input?: Token | Token[]): Token[] {
  if (input == null) return []
  return Array.isArray(input) ? input : [input]
}
