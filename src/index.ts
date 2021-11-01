export * from './p.types'
export * from './node'
export * from './node-context'
export * from './root-context'
export * from './console-utils'
import { ProstoParserNode } from './node'
import { ProstoParserNodeContext } from './node-context'

export class ProstoParser {
    protected readonly nodes: Record<number, ProstoParserNode> = {} as Record<number, ProstoParserNode>

    constructor(protected readonly rootNode: ProstoParserNode<unknown>) { }

    public parse(src: string): ProstoParserNodeContext {
        return this.rootNode.createContext(0, 0).rootContext.parse(this.nodes, src)
    }
}
