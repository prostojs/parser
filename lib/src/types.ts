import type { Node } from './node'

/** Token: string (exact match), RegExp, or dynamic function */
export type Token = string | RegExp | ((ctx: MatchContext) => string | RegExp)

/** Context passed to dynamic token functions */
export interface MatchContext {
  node: ParsedNode
  parent?: ParsedNode
  source: string
  pos: number
}

/** Token descriptor with modifiers */
export interface TokenDescriptor {
  token: Token
  omit?: boolean
  eject?: boolean
  backslash?: boolean
}

/** Shorthand: Token or full descriptor */
export type TokenDef = Token | TokenDescriptor

/** Result of a token match — passed to hooks */
export interface MatchResult {
  /** Full matched text */
  text: string
  /** Named capture groups (if regex with named groups) */
  groups?: Record<string, string>
}

/** Hooks fired during parsing lifecycle */
export interface NodeHooks<T = any> {
  /** Called when start token matches. Return false to reject. */
  onOpen?: (node: ParsedNode<T>, match: MatchResult | null) => void | false
  /** Called when end token matches. match is null for eofClose. */
  onClose?: (node: ParsedNode<T>, match: MatchResult | null) => void
  /** Called when text is about to be appended. Return transformed string. */
  onContent?: (text: string, node: ParsedNode<T>) => string | void
  /** Called after a child node is parsed and added to content */
  onChild?: (child: ParsedNode, node: ParsedNode<T>) => void
}

/** Position in source */
export interface Position {
  offset: number
  line: number
  column: number
}

/** Configuration for a Node */
export interface NodeOptions<T = any> {
  name?: string
  start?: TokenDef | TokenDef[]
  end?: TokenDef | TokenDef[]
  recognizes?: Node<any>[]
  skip?: Token | Token[]
  bad?: Token | Token[]
  eofClose?: boolean
  /** Data initializer: plain object (cloned per match) or factory function */
  data?: T | (() => T)
  /**
   * Auto-join all text content into this data field on close.
   * Eliminates the need for onClose hooks that just call textContent().
   */
  mapContent?: string
  hooks?: NodeHooks<T>
}

/** A parsed node instance */
export interface ParsedNode<T = any> {
  node: Node<T>
  content: (string | ParsedNode)[]
  data: T
  start: Position
  end: Position
  parent?: ParsedNode
}

export type { Node }
