import { TParseMatchResult, TPorstoParserCallbackData, TPorstoParserCallbackDataMatched } from '.'
import { renderCodeFragment } from './console-utils'
import { ProstoHoistManager } from './hoist-manager'
import { ProstoParseNode } from './node'
import { ProstoParseNodeContext } from './node-context'

const banner = __DYE_RED__ + '[parser]' + __DYE_COLOR_OFF__

export class ProstoParserRootContext {
    protected nodes: Record<number, ProstoParseNode> = {} as Record<number, ProstoParseNode>

    public pos = 0

    public index = 0
    
    public context: ProstoParseNodeContext
    
    public node: ProstoParseNode
    
    public behind: string = ''
    
    public here: string = ''
    
    public src: string = ''

    protected readonly stack: ProstoParseNodeContext[] = []

    protected l: number = 0
    
    public readonly hoistManager = new ProstoHoistManager()

    constructor(protected readonly root: ProstoParseNodeContext) {
        this.context = root
        this.node = root.node
    }

    getNode(id: number) {
        return this.nodes[id]
    }

    public parse(nodes: Record<number, ProstoParseNode>, src: string) {
        this.nodes = nodes
        this.src = src,
        this.here = src,
        this.l = src.length

        while (this.pos < this.l) {
            let matchedChild: ProstoParseNode | undefined
            let matchedToken: string = ''
            let matchResult: TParseMatchResult = {
                rg: [''],
                matched: false,
            }
            for (let i = 0; i < this.node.recognizes.length; i++) {
                const id = this.node.recognizes[i]
                const recognizeNode = this.getNode(id)
                if (!recognizeNode) {
                    this.panic(`Node [${ id }] required by the node "${ this.node.name }" not found.`)
                }
                matchResult = recognizeNode.startMatches(this.behind, this.here, this.getCallbackData()) 
                if (matchResult.matched) {
                    matchedChild = recognizeNode
                    matchedToken = matchResult.rg[0]
                    break
                }
            }
            if (matchResult.matched && matchedChild) {
                let toAppend = ''
                if (matchResult.eject) {
                    this.context.appendContent(matchedToken)
                    this.jump(matchedToken.length)
                } else if (matchResult.omit) {
                    this.jump(matchedToken.length)
                } else {
                    toAppend = src[this.pos]
                    this.jump()
                }
                this.pushNewContext(matchedChild, toAppend ? [toAppend] : [])
                if (matchedChild.options.onMatch) {
                    matchedChild.options.onMatch(this.getCallbackData(matchResult.rg) as TPorstoParserCallbackDataMatched)
                }
                continue
            }
            matchResult = this.node.endMatches(this.behind, this.here, this.getCallbackData())
            if (matchResult.matched) {
                matchedToken = matchResult.rg[0]
                if (matchResult.eject) {
                    this.pop()
                } else if (matchResult.omit) {
                    this.jump(matchedToken.length)
                    this.pop()
                } else {
                    this.context.appendContent(matchedToken)
                    this.jump(matchedToken.length)
                    this.pop()
                }
                continue
            }
            this.context.appendContent(src[this.pos])
            this.jump()
        }

        if (this.context !== this.root) {
            while (this.node.options.popsAtEOFSource && this.stack.length > 0) this.pop()
        }

        if (this.context !== this.root) {
            this.panic(`Unexpected end of the source string while parsing "${ this.context.node.name }" (${ this.context.index }) node.`)
        }

        return this.root
    }

    pop() {
        let parentContext = this.stack.pop()
        this.context.onPop()
        if (parentContext) {
            this.context.mergeIfRequired(parentContext)
            let popsAfter = parentContext.getPopsAfter()
            while (!!parentContext && (popsAfter.includes(this.context.node.id))) {
                this.context = parentContext
                parentContext = this.stack.pop()
                this.context.onPop()
                if (parentContext) {    
                    this.context.mergeIfRequired(parentContext)
                    popsAfter = parentContext && parentContext.getPopsAfter() || []
                }
            }
        }

        if (parentContext) {
            this.context = parentContext
        } else {
            // end
        }

        this.node = this.context.node      
    }

    pushNewContext(newNode: ProstoParseNode, content: ProstoParseNodeContext['content']) {
        this.index++
        const ctx = newNode.createContext(this.index, this.stack.length + 1, this)
        ctx.content = content
        this.context.content.push(ctx)
        this.stack.push(this.context)
        this.hoistManager.addHoistOptions(this.context)
        this.context = ctx
        this.node = this.context.node
    }

    fromStack(depth = 0) {
        return this.stack[this.stack.length - depth - 1]
    }

    jump(n: number = 1): number {
        this.pos += n
        this.behind = this.src.slice(0, this.pos)
        this.here = this.src.slice(this.pos, this.l)
        return this.pos
    }

    getCallbackData<T = Record<string, unknown>>(matched?: RegExpMatchArray): TPorstoParserCallbackData<T> | TPorstoParserCallbackDataMatched<T> {
        return {
            rootContext: this,
            context: this.context,
            matched,
            customData: this.context.getCustomData<T>(),
        }
    }

    getPosition(offset = 0) {
        const past = this.src.slice(0, this.pos + offset).split('\n')
        const row = past.length
        const col = past.pop()?.length || 0
        return {
            row, col, pos: this.pos,
        }
    }

    panic(message: string, errorBackOffset = 0) {
        if (this.pos > 0) {
            const { row, col } = this.getPosition(-errorBackOffset)
            console.error(banner + __DYE_RED_BRIGHT__, message, __DYE_RESET__)
            console.error(this.context.toTree())
            console.error(renderCodeFragment(this.src.split('\n'), {
                row: row - 1,
                error: col,
            }))
        }
        throw new Error(message)
    }
}
