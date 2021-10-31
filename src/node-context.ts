import { ProstoParseNode } from './node'
import { ProstoParserRootContext } from './root-context'
import { parserTree } from './tree'

export class ProstoParseNodeContext<ContextCustomType extends Record<string, unknown> = Record<string, unknown>> {
    public content: (string | ProstoParseNodeContext | 0)[] = []

    public customContent: ContextCustomType = {} as ContextCustomType

    public label: string

    public icon: string

    public readonly rootContext: ProstoParserRootContext

    constructor(protected readonly _node: ProstoParseNode, public readonly index: number, public readonly level: number, rootContext?: ProstoParserRootContext) {
        this.label = _node.options.label || ''
        this.icon = _node.options.icon || '◦'
        this.rootContext = rootContext || new ProstoParserRootContext(this)
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

    appendContent(input: string | ProstoParseNodeContext['content']) {
        let s = input
        const node = this.node
        if (typeof s === 'string' && node.options.skipToken) {
            const matched = node.skipMatches('', s)
            if (matched) {
                return this.rootContext.jump(matched[0].length - 1)
            }
        }
        if (node.options.onAppendContent) {
            s = node.options.onAppendContent(input, this.rootContext.getCallbackData())
        }
        const len = this.content.length
        const contentLast = this.content[len - 1]
        if (typeof contentLast === 'string') {
            if (typeof s === 'string') {
                this.content[len - 1] += s
            } else {
                this.content.push(...s)
            }
            return
        } else if (contentLast === 0) {
            this.content = this.content.slice(0, len - 1)
        }
        if (typeof s === 'string') {
            this.content.push(s)
        } else {
            this.content.push(...s)
        }
    }

    onPop() {
        this.processMappings()
        if (this.node.options.onPop) {
            this.node.options.onPop(this.rootContext.getCallbackData())
        }
    }

    getPopsAfter() {
        return this.node.options.popsAfterNode ? [this.node.options.popsAfterNode].flat() : []
    }

    mergeIfRequired(parentContext: ProstoParseNodeContext) {
        if (parentContext && this.node.options.mergeWith) {
            const parentNode = parentContext.node
            for (let i = 0; i < this.node.options.mergeWith.length; i++) {
                const { parent, join } = this.node.options.mergeWith[i]
                const mergeWith = [parent].flat()
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
        this.rootContext.hoistManager.removeHoistOptions(this)
        this.rootContext.hoistManager.processHoistOptions(this)
        this.processMapContent()
    }

    processMapContent() {
        const targetNodeOptions = this.node.options
        if (targetNodeOptions.mapContent) {
            Object.keys(targetNodeOptions.mapContent).forEach((key: string) => {
                if (targetNodeOptions.mapContent && targetNodeOptions.mapContent[key]) {
                    (this.customContent as Record<string, unknown>)[key] = targetNodeOptions.mapContent[key](this.content)
                }
            })
        }
    }
}

