import type { ParsedNode } from './types'

/** Get only string content, joined */
export function textContent(node: ParsedNode): string {
  let result = ''
  for (const item of node.content) {
    if (typeof item === 'string') {
      result += item
    }
  }
  return result
}

/** Get only child ParsedNodes from content */
export function children(node: ParsedNode): ParsedNode[] {
  return node.content.filter((item): item is ParsedNode => typeof item !== 'string')
}

/** Find first child matching a node definition */
export function findChild<T>(node: ParsedNode, target: { name?: string } & Record<string, any>): ParsedNode<T> | undefined {
  for (const item of node.content) {
    if (typeof item !== 'string' && item.node === target) {
      return item as ParsedNode<T>
    }
  }
  return undefined
}

/** Find all children matching a node definition */
export function findChildren<T>(node: ParsedNode, target: { name?: string } & Record<string, any>): ParsedNode<T>[] {
  const result: ParsedNode<T>[] = []
  for (const item of node.content) {
    if (typeof item !== 'string' && item.node === target) {
      result.push(item as ParsedNode<T>)
    }
  }
  return result
}

/** Walk all descendants depth-first */
export function walk(node: ParsedNode, fn: (child: ParsedNode, depth: number) => void | false, depth = 0): void {
  for (const item of node.content) {
    if (typeof item !== 'string') {
      if (fn(item, depth + 1) === false) return
      walk(item, fn, depth + 1)
    }
  }
}

/** Pretty-print the parse tree */
export function printTree(node: ParsedNode, indent = ''): string {
  const name = node.node.name || '(anonymous)'
  const dataStr = Object.keys(node.data as any).length > 0 ? ` ${JSON.stringify(node.data)}` : ''
  let result = `${indent}${name}${dataStr}\n`

  for (const item of node.content) {
    if (typeof item === 'string') {
      if (item.trim()) {
        result += `${indent}  "${item.length > 40 ? item.slice(0, 40) + '...' : item}"\n`
      }
    } else {
      result += printTree(item, indent + '  ')
    }
  }
  return result
}
