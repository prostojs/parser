export * from './p.types'
export * from './node'
export * from './node-context'
export * from './root-context'
export * from './console-utils'
import { ProstoParseNode } from './node'
import { ProstoParseNodeContext } from './node-context'
import { TProstoParserOptions } from './p.types'

export class ProstoParser {
    protected readonly nodes: Record<number, ProstoParseNode> = {} as Record<number, ProstoParseNode>

    protected readonly rootNode: ProstoParseNode

    constructor(protected options: TProstoParserOptions) {
        options.nodes.forEach(node => {
            if (this.nodes[node.id]) {
                throw new Error(`[parser] Duplicate Node "${ node.name }". Check Parser Options -> nodes.`)
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.nodes[node.id] = node
        })
        if (!this.getNode(this.options.rootNode.id)) this.nodes[this.options.rootNode.id] = this.options.rootNode
        this.rootNode = this.options.rootNode
    }

    public parse(src: string): ProstoParseNodeContext {
        return this.rootNode.createContext(0, 0).rootContext.parse(this.nodes, src)
    }

    public getNode(id: number) {
        return this.nodes[id]
    }
}
