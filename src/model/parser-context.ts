import { TPorstoParserCallbackData, TPorstoParserCallbackDataMatched } from '../p.types'
import { renderCodeFragment } from '../console-utils'
import { ProstoHoistManager } from './hoist-manager'
import { ProstoParserNode } from './node'
import { ProstoParserNodeContext } from './node-context'
import { TGenericCustomDataType, TSearchToken } from '..'

const banner = __DYE_RED__ + '[parser]' + __DYE_COLOR_OFF__

export class ProstoParserContext {
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

    public parse(src: string) {
        this.src = src,
        this.here = src,
        this.l = src.length
        const cache: Record<string, RegExpExecArray | null> = {}

        while (this.pos < this.l) {
            const searchTokens = this.context.getSearchTokens()
            let closestIndex = Number.MAX_SAFE_INTEGER
            let closestToken: TSearchToken | undefined
            let matched: RegExpExecArray | undefined
            for (const t of searchTokens) {
                const key = t.g.source
                t.g.lastIndex = this.pos
                let cached = cache[key]
                if (cached === null) continue
                if (cached && cached.index < this.pos) {
                    cached = null
                    delete cache[key]
                }
                if (!cached) {
                    cached = t.g.exec(this.src)
                    if (cached || (this.pos === 0 && !cached)) {
                        cache[key] = cached
                    }
                }
                if (cached && cached.index < closestIndex) {
                    closestIndex = cached.index
                    matched = cached
                    closestToken = t
                    if (closestIndex === this.pos) break
                }
            }
            if (closestToken && matched) {
                const toAppend = this.src.slice(this.pos, closestIndex)
                if (toAppend) {
                    this.context.appendContent(toAppend)
                    this.jump(toAppend.length)
                }
                const matchedToken = matched[0]
                if (closestToken.node) {
                    // matched child
                    const { omit, eject, confirmed } = closestToken.node.fireNodeMatched(matched, this.getCallbackData(matched))
                    if (!confirmed) continue
                    let toAppend = ''
                    if (eject) {
                        this.context.appendContent(matchedToken)
                    } else if (!omit) {
                        toAppend = matchedToken
                    }
                    this.jump(matchedToken.length)
                    this.pushNewContext(closestToken.node, toAppend ? [toAppend] : [])
                    this.context.fireOnMatch(matched)
                    continue                    
                } else {
                    // matched end token
                    const { omit, eject, confirmed } = this.context.fireNodeEndMatched(matched, this.getCallbackData(matched))
                    if (!confirmed) continue
                    if (!eject && !omit) {
                        this.context.appendContent(matchedToken)
                    }
                    if (!eject) {
                        this.jump(matchedToken.length)
                    }
                    this.context.mapNamedGroups(matched)
                    this.pop()
                    continue
                }
            } else {
                // nothing matched
                this.context.appendContent(this.here)
                this.jump(this.here.length)
            }
        }

        if (this.context !== this.root) {
            while (this.context.getPopsAtEOFSource() && this.stack.length > 0) this.pop()
        }

        if (this.context !== this.root) {
            this.panicBlock(`Unexpected end of the source string while parsing "${ this.context.node.name }" (${ this.context.index }) node.`)
        }

        return this.root
    }

    public pop() {
        const parentContext = this.stack.pop()
        this.context.fireOnPop()
        if (parentContext) {
            // this.context.appendOrMergeTo(parentContext)
            parentContext.fireAfterChildParse(this.context)
            parentContext.fireAbsorb(this.context)
            this.context.cleanup()
            const node = this.context.node
            this.context = parentContext
            if (parentContext.popsAfterNode.includes(node)) {
                this.pop()
            }
        } else {
            this.context.cleanup()
        }   
    }

    public pushNewContext(newNode: ProstoParserNode, content: ProstoParserNodeContext['content']) {
        this.index++
        const ctx = newNode.createContext(this.index, this.stack.length + 1, this)
        ctx.content = content
        this.context.fireBeforeChildParse(ctx)
        this.context.pushChild(ctx)
        this.stack.push(this.context)
        this.hoistManager.addHoistOptions(this.context)
        this.context = ctx
    }

    public fromStack(depth = 0) {
        return this.stack[this.stack.length - depth - 1]
    }

    public jump(n: number = 1): number {
        this.pos += n
        this.behind = this.src.slice(0, this.pos)
        this.here = this.src.slice(this.pos, this.l)
        return this.pos
    }

    public getCallbackData<T extends TGenericCustomDataType>(matched?: RegExpExecArray): TPorstoParserCallbackData<T> | TPorstoParserCallbackDataMatched<T> {
        return {
            parserContext: this,
            context: this.context as ProstoParserNodeContext<T>,
            matched,
            customData: this.context.getCustomData<T>(),
        }
    }

    public getPosition(offset = 0) {
        const past = this.src.slice(0, this.pos + offset).split('\n')
        const row = past.length
        const col = past.pop()?.length || 0
        return {
            row, col, pos: this.pos,
        }
    }

    public panic(message: string, errorBackOffset = 0) {
        if (this.pos > 0) {
            const { row, col } = this.getPosition(-errorBackOffset)
            console.error(banner + __DYE_RED_BRIGHT__, message, __DYE_RESET__)
            console.log(this.context.toTree({ childrenLimit: 5, showLast: true, level: 1 }))
            console.error(renderCodeFragment(this.src.split('\n'), {
                row: row,
                error: col,
            }))
        }
        throw new Error(message)
    }

    public panicBlock(message: string, topBackOffset = 0, bottomBackOffset = 0) {
        if (this.pos > 0) {
            const { row, col } = this.getPosition(-bottomBackOffset)
            console.error(banner + __DYE_RED_BRIGHT__, message, __DYE_RESET__)
            console.log(this.context.toTree({ childrenLimit: 13, showLast: true, level: 12 }))
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

