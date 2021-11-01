import { TParseMatchResult, TPorstoParserCallbackData, TPorstoParserCallbackDataMatched } from '.'
import { renderCodeFragment } from './console-utils'
import { ProstoHoistManager } from './hoist-manager'
import { ProstoParserNode } from './node'
import { ProstoParserNodeContext } from './node-context'

const banner = __DYE_RED__ + '[parser]' + __DYE_COLOR_OFF__

export class ProstoParserRootContext {
    protected nodes: Record<number, ProstoParserNode> = {} as Record<number, ProstoParserNode>

    public pos = 0

    public index = 0
    
    public context: ProstoParserNodeContext
        
    public behind: string = ''
    
    public here: string = ''
    
    public src: string = ''

    protected readonly stack: ProstoParserNodeContext[] = []

    protected l: number = 0
    
    public readonly hoistManager = new ProstoHoistManager()

    constructor(protected readonly root: ProstoParserNodeContext) {
        this.context = root
    }

    getNode(id: number) {
        return this.nodes[id]
    }

    public parse(nodes: Record<number, ProstoParserNode>, src: string) {
        this.nodes = nodes
        this.src = src,
        this.here = src,
        this.l = src.length

        while (this.pos < this.l) {
            let matchedChild: ProstoParserNode | undefined
            let matchedToken: string = ''
            let matchResult: TParseMatchResult = {
                rg: [''],
                matched: false,
            }
            const options = this.context.getOptions()
            for (let i = 0; i < options.recognizes.length; i++) {
                const recognizeNode = options.recognizes[i]
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
                    this.jump(this.context.appendContent(matchedToken))
                } else if (matchResult.omit) {
                    this.jump(matchedToken.length)
                } else {
                    toAppend = matchedToken
                    this.jump(matchedToken.length)
                }
                this.pushNewContext(matchedChild, toAppend ? [toAppend] : [])
                matchedChild.onMatch(this.getCallbackData(matchResult.rg) as TPorstoParserCallbackDataMatched)
                continue
            }
            matchResult = this.context.endMatches(this.behind, this.here, this.getCallbackData())
            if (matchResult.matched) {
                matchedToken = matchResult.rg[0]
                if (matchResult.eject) {
                    this.pop()
                } else if (matchResult.omit) {
                    this.jump(matchedToken.length)
                    this.pop()
                } else {
                    this.jump(this.context.appendContent(matchedToken))
                    this.pop()
                }
                continue
            }
            this.jump(this.context.appendContent(src[this.pos]))
        }

        if (this.context !== this.root) {
            while (this.context.getOptions().popsAtEOFSource && this.stack.length > 0) this.pop()
        }

        if (this.context !== this.root) {
            this.panicBlock(`Unexpected end of the source string while parsing "${ this.context.node.name }" (${ this.context.index }) node.`)
        }

        return this.root
    }

    pop() {
        const parentContext = this.stack.pop()
        this.context.onPop()
        if (parentContext) {
            this.context.appendOrMergeTo(parentContext)
            parentContext.afterChildParse(this.context)
            this.context.cleanup()
            const node = this.context.node
            this.context = parentContext
            if (parentContext.getPopsAfter().includes(node)) {
                this.pop()
            }
        } else {
            this.context.cleanup()
        }   
    }

    pushNewContext(newNode: ProstoParserNode, content: ProstoParserNodeContext['content']) {
        this.index++
        const ctx = newNode.createContext(this.index, this.stack.length + 1, this)
        ctx.content = content
        this.context.beforeChildParse(ctx)
        this.context.content.push(ctx)
        this.stack.push(this.context)
        this.hoistManager.addHoistOptions(this.context)
        this.context = ctx
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
            context: this.context as ProstoParserNodeContext<T>,
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
                row: row,
                error: col,
            }))
        }
        throw new Error(message)
    }

    panicBlock(message: string, topBackOffset = 0, bottomBackOffset = 0) {
        if (this.pos > 0) {
            const { row, col } = this.getPosition(-bottomBackOffset)
            console.error(banner + __DYE_RED_BRIGHT__, message, __DYE_RESET__)
            console.error(this.context.toTree())
            console.error(renderCodeFragment(this.src.split('\n'), {
                row: this.context.startPos.row,
                error: this.context.startPos.col - topBackOffset,
                rowEnd: row,
                errorEnd: col,
            }))
        }
        throw new Error(message)
    }
}
