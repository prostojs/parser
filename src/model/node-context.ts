import { TProstoParserNodeOptions } from '../p.types'
import { ProstoParserNode } from './node'
import { ProstoParserNodeBase } from './node-base'
import { ProstoParserContext } from './parser-context'
import { parserTree } from '../tree'
import { TDefaultCustomDataType, TGenericCustomDataType } from '..'

export class ProstoParserNodeContext<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNodeBase<T> {
    public content: (string | ProstoParserNodeContext | 0)[] = []

    protected readonly _customData: T = {} as T

    public label: string

    public icon: string

    public readonly parserContext: ProstoParserContext

    public readonly startPos: { row: number, col: number, pos: number }

    public endPos: { row: number, col: number, pos: number }

    protected options: TProstoParserNodeOptions<T>

    public getOptions(): Required<TProstoParserNodeOptions<T>> {
        return this.options as Required<TProstoParserNodeOptions<T>>
    }

    constructor(protected readonly _node: ProstoParserNode<T>, public readonly index: number, public readonly level: number, rootContext?: ProstoParserContext) {
        super()
        this.options = _node.getOptions()
        this.label = this.options.label || ''
        this.icon = this.options.icon || '◦'
        this.parserContext = rootContext || new ProstoParserContext(this)
        this.startPos = this.parserContext.getPosition()
        this.endPos = this.parserContext.getPosition()
    }

    public getCustomData<T2 extends TGenericCustomDataType = T>() {
        return this._customData as unknown as T2
    }

    public get nodeId() {
        return this._node.id
    }

    public get node() {
        return this._node
    }

    public toTree(): string { 
        return parserTree.render(this)
    }

    beforeChildParse(child: ProstoParserNodeContext) {
        if (this.options.onBeforeChildParse) {
            return this.options.onBeforeChildParse(child, this.parserContext.getCallbackData())
        }
    }

    afterChildParse(child: ProstoParserNodeContext) {
        if (this.options.onAfterChildParse) {
            return this.options.onAfterChildParse(child, this.parserContext.getCallbackData())
        }
    }

    appendContent(input: string | ProstoParserNodeContext<T>['content']): number {
        let s = input
        let jumpLen = 1
        this.endPos = this.parserContext.getPosition()
        if (typeof s === 'string') {
            const matched = this.skipMatches('', s)
            if (matched) {
                return this.parserContext.jump(matched[0].length - 1)
            } else if (this.badMatches('', s) || !this.goodMatches('', s)) {
                this.parserContext.panic(`The token "${ s.replace(/"/g, '\\"') }" is not allowed in "${ this.node.name }".`)
            }
            jumpLen = s.length
        }
        if (this.options.onAppendContent) {
            s = this.options.onAppendContent(input, this.parserContext.getCallbackData())
            jumpLen = typeof s === 'string' ? s.length : jumpLen
        }
        const len = this.content.length
        const contentLast = this.content[len - 1]
        if (typeof contentLast === 'string') {
            if (typeof s === 'string') {
                this.content[len - 1] += s
            } else {
                this.content.push(...s)
            }
            return jumpLen
        } else if (contentLast === 0) {
            this.content = this.content.slice(0, len - 1)
        }
        if (typeof s === 'string') {
            this.content.push(s)
        } else {
            this.content.push(...s)
        }
        return jumpLen
    }

    onPop() {
        this.endPos = this.parserContext.getPosition()
        this.processMappings()
        if (this.options.onPop) {
            this.options.onPop(this.parserContext.getCallbackData())
        }
    }

    cleanup() {
        // cleaning up the copy of options
        // when we don't need it any longer
        this.options = null as unknown as TProstoParserNodeOptions<T>
    }

    getPopsAfter(): ProstoParserNode[] {
        return this.options.popsAfterNode || []
    }

    appendOrMergeTo(parentContext: ProstoParserNodeContext) {
        if (parentContext && this.options.mergeWith) {
            const parentNode = parentContext.node
            for (let i = 0; i < this.options.mergeWith.length; i++) {
                const { parent, join } = this.options.mergeWith[i]
                const mergeWith = [parent].flat().map(item => typeof item === 'object' ? item.id : item)
                if (mergeWith[0] === '*' || mergeWith.includes(parentNode.id)) {
                    parentContext.content = parentContext.content.slice(0, parentContext.content.length - 1)
                    if (join) {
                        if (this.content.length === 1 && typeof this.content[0] === 'string') {
                            parentContext.appendContent(this.content[0])
                        } else {
                            parentContext.appendContent(this.content)
                        }
                    } else {
                        parentContext.content.push(...this.content, 0)
                    }
                    return
                }
            }
        }
        // we're not merging anymore, so the last zero is useless
        this.removeLastZero()
    }

    removeLastZero() {
        const len = this.content.length
        if (this.content[len - 1] === 0) {
            this.content = this.content.slice(0, len - 1)
        }
    }

    processMappings() {
        this.parserContext.hoistManager.removeHoistOptions(this)
        this.parserContext.hoistManager.processHoistOptions(this)
        this.processMapContent()
    }

    processMapContent() {
        const targetNodeOptions = this.options
        if (targetNodeOptions.mapContent) {
            Object.keys(targetNodeOptions.mapContent).forEach((key: string) => {
                if (targetNodeOptions.mapContent && targetNodeOptions.mapContent[key]) {
                    (this._customData as Record<string, unknown>)[key] = targetNodeOptions.mapContent[key](this.content)
                }
            })
        }
    }
}

