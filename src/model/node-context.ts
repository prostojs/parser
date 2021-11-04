import { TProstoParserNodeOptions } from '../p.types'
import { ProstoParserNode } from './node'
import { ProstoParserNodeBase } from './node-base'
import { ProstoParserContext } from './parser-context'
import { parserTree } from '../tree'
import { TDefaultCustomDataType, TGenericCustomDataType, TMapContentRules, TPorstoParserCallbackData, TPorstoParserCallbackDataMatched, TSearchToken } from '..'
import { TProstoTreeRenderOptions } from '@prostojs/tree'

export class ProstoParserNodeContext<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNodeBase<T> {
    public content: (string | ProstoParserNodeContext)[] = []

    protected readonly _customData: T = {} as T

    private _label: string

    private _icon: string

    public readonly parserContext: ProstoParserContext

    public readonly startPos: { row: number, col: number, pos: number }

    public endPos: { row: number, col: number, pos: number }

    protected hasNodes: ProstoParserNode[] = []

    protected count: Record<number, number> = {}

    protected options: TProstoParserNodeOptions<T>

    protected getOptions(): TProstoParserNodeOptions<T> {
        return this.options as Required<TProstoParserNodeOptions<T>>
    }

    constructor(protected readonly _node: ProstoParserNode<T>, public readonly index: number, public readonly level: number, rootContext?: ProstoParserContext) {
        super()
        this.options = _node.getOptions()
        if (this.options.initCustomData) {
            this._customData = this.options.initCustomData()
        }
        this._label = this.options.label || ''
        this._icon = this.options.icon || '◦'
        this.parserContext = rootContext || new ProstoParserContext(this)
        this.startPos = this.parserContext.getPosition()
        this.endPos = this.parserContext.getPosition()
    }

    public set icon(value: string) {
        this._icon = value
    }

    public get icon() {
        return this._icon
    }

    public set label(value: string) {
        this._label = value
    }

    public get label() {
        return this._label
    }

    public getCustomData<T2 extends TGenericCustomDataType = T>() {
        return this._customData as unknown as T2
    }

    public get customData() {
        return this._customData
    }

    public get nodeId() {
        return this._node.id
    }

    public get node() {
        return this._node
    }

    public toTree(options?: TProstoTreeRenderOptions): string { 
        return parserTree.render(this, options)
    }

    public getSearchTokens(): TSearchToken[] {
        const rg = this.getEndTokenRg()
        const tokens: TSearchToken[] = rg ? [{
            rg,
            y: addFlag(rg, 'y'),
            g: addFlag(rg, 'g'),
        }] : []
        this.options.recognizes?.forEach(node => {
            const rg = node.getStartTokenRg()
            if (rg) {
                tokens.push({
                    rg,
                    y: addFlag(rg, 'y'),
                    g: addFlag(rg, 'g'),
                    node,
                })
            }
        })
        function addFlag(rg: RegExp, f: string): RegExp {
            return new RegExp(rg.source, rg.flags + f)
        }
        return tokens
    }

    public appendContent(input: string) {
        let s = input
        this.endPos = this.parserContext.getPosition()
        let { skip, bad } = this.getConstraintTokens()
        skip = skip ? new RegExp(skip.source, skip.flags + 'g') : skip
        bad = bad ? new RegExp(bad.source, bad.flags + 'g') : bad
        if (skip) {
            s = s.replace(skip, '')
        }
        if (bad) {
            const m = bad.exec(s)
            if (m) {
                this.parserContext.jump(m.index)
                this.parserContext.panic(`The token "${ m[0].replace(/"/g, '\\"') }" is not allowed in "${ this.node.name }".`)
            }
        }
        s = this.fireOnAppendContent(s)
        if (s) {
            this.content.push(s)
        }
    }

    public cleanup() {
        // cleaning up the copy of options
        // when we don't need it any longer
        this.options = null as unknown as TProstoParserNodeOptions<T>
    }

    // public appendOrMergeTo(parentContext: ProstoParserNodeContext) {
    //     if (parentContext && this.options.mergeWith) {
    //         const parentNode = parentContext.node
    //         for (let i = 0; i < this.options.mergeWith.length; i++) {
    //             const { parent, join } = this.options.mergeWith[i]
    //             const mergeWith = [parent].flat().map(item => typeof item === 'object' ? item.id : item)
    //             if (mergeWith[0] === '*' || mergeWith.includes(parentNode.id)) {
    //                 parentContext.content = parentContext.content.slice(0, parentContext.content.length - 1)
    //                 if (join) {
    //                     if (this.content.length === 1 && typeof this.content[0] === 'string') {
    //                         parentContext.appendContent(this.content[0])
    //                     } else {
    //                         parentContext.appendContent(this.content)
    //                     }
    //                 } else {
    //                     parentContext.content.push(...this.content)
    //                 }
    //             }
    //         }
    //     }
    // }
    
    public pushChild(child: ProstoParserNodeContext) {
        const absorbRule = this.options.absorbs && this.options.absorbs[child.node.id]
        if (!absorbRule) {
            this.content.push(child)
        }
    }

    public fireAbsorb(child: ProstoParserNodeContext) {
        const absorbRule = this.options.absorbs && this.options.absorbs[child.node.id]
        if (absorbRule) {
            // remove this child from content
            // this.content.pop()
            switch (absorbRule) {
                case 'append':
                    this.content.push(...child.content)
                    break
                case 'join':
                    this.appendContent(child.content.join(''))
                    break
                default:
                    const [action, target] = absorbRule.split('->')
                    const cd = this.getCustomData<T>()
                    if (action === 'copy') {
                        cd[target as keyof T] = child.content as unknown as T[keyof T]
                    } else if (action === 'join') {
                        cd[target as keyof T] = child.content.join('') as unknown as T[keyof T]
                    }
            }
        }
    }

    public has(node: ProstoParserNode) {
        return this.hasNodes.includes(node)
    }

    public countOf(node: ProstoParserNode) {
        return this.count[node.id] || 0
    }

    public mapNamedGroups(matched: RegExpExecArray) {
        if (matched.groups) {
            // mapping named groups to customData
            const cd = this.getCustomData<Record<string, unknown>>()
            for (const [key, value] of Object.entries(matched.groups)) {
                if (key === 'content') {
                    this.appendContent(value)
                } else {
                    cd[key] = value
                }
            }
        }
    }

    //
    // Fire Hooks Callbacks  =======================================================================================
    //

    public fireOnPop() {
        this.endPos = this.parserContext.getPosition()
        this.processMappings()
        const data: TPorstoParserCallbackData<T> = this.parserContext.getCallbackData()
        this.node.beforeOnPop(data)
        if (this.options.onPop) {
            this.options.onPop(data)
        }
    }

    public fireOnMatch(matched: RegExpExecArray): void {
        this.mapNamedGroups(matched)
        const data: TPorstoParserCallbackDataMatched<T> = this.parserContext.getCallbackData(matched) as TPorstoParserCallbackDataMatched<T>
        this.node.beforeOnMatch(data)
        if (this.options.onMatch) {
            return this.options.onMatch(data)
        }
    }

    public fireBeforeChildParse(child: ProstoParserNodeContext): void {
        const data: TPorstoParserCallbackData<T> = this.parserContext.getCallbackData()
        this.node.beforeOnBeforeChildParse(child, data)
        if (this.options.onBeforeChildParse) {
            return this.options.onBeforeChildParse(child, data)
        }
    }

    public fireAfterChildParse(child: ProstoParserNodeContext): void {
        if (!this.hasNodes.includes(child.node)) {
            this.hasNodes.push(child.node)
        }
        this.count[child.node.id] = this.count[child.node.id] || 0
        this.count[child.node.id]++
        const data: TPorstoParserCallbackData<T> = this.parserContext.getCallbackData()
        this.node.beforeOnAfterChildParse(child, data)
        if (this.options.onAfterChildParse) {
            return this.options.onAfterChildParse(child, data)
        }
    }

    public fireOnAppendContent(s: string): string {
        let _s = s
        const data: TPorstoParserCallbackData<T> = this.parserContext.getCallbackData()
        _s = this.node.beforeOnAppendContent(_s, data)
        if (this.options.onAppendContent) {
            _s = this.options.onAppendContent(_s, data)
        }
        return _s
    }

    //
    // Private  =======================================================================================
    //

    private processMappings() {
        this.parserContext.hoistManager.removeHoistOptions(this)
        this.parserContext.hoistManager.processHoistOptions(this)
        this.processMapContent()
    }

    private processMapContent() {
        const targetNodeOptions = this.options
        if (targetNodeOptions.mapContent) {
            Object.keys(targetNodeOptions.mapContent).forEach((key) => {
                const keyOfT: keyof T = key as keyof T
                if (targetNodeOptions.mapContent && targetNodeOptions.mapContent[keyOfT]) {
                    const mapRule = targetNodeOptions.mapContent[keyOfT]
                    if (typeof mapRule === 'function') {
                        this._customData[keyOfT] = mapRule(this.content) as T[keyof T]
                    } else {
                        const key: TMapContentRules = mapRule
                        this._customData[keyOfT] = this.mapContentRules[key](this.content) as T[keyof T]
                    }
                }
            })
        }
    }

    mapContentRules: { [key in TMapContentRules]: ((content: ProstoParserNodeContext<T>['content']) => unknown)} = {
        'first': (content) => content[0],
        'shift': (content) => content.shift(),
        'pop': (content) => content.pop(),
        'last': (content) => content[content.length - 1],
        'join': (content) => content.join(''),
        'join-clear': (content) => content.splice(0).join(''),
    }   
}
