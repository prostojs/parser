export * from './p.types'
import { ProstoTree } from '@prostojs/tree'
import { TProstoParserOptions, TGenericNodeIdType, TProstoParseNode, TProstoParserTokenDescripor,
    TProstoParserContext, TPorstoParserCallbackData, TProstoParserHoistOptions } from './p.types'

const styles = {
    banner: (s: string) => __DYE_RED__ + s + __DYE_COLOR_OFF__,
    text: (s: string) => __DYE_GREEN__ + s + __DYE_COLOR_OFF__,
    valuesDim: (s: string) => __DYE_CYAN__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    values: (s: string) => __DYE_CYAN_BRIGHT__ + s + __DYE_COLOR_OFF__,
    nodeDim: (s: string) => __DYE_YELLOW__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    node: (s: string) => __DYE_YELLOW__ + s + __DYE_COLOR_OFF__,
}

const banner = styles.banner('[parser]')

const parserTree = new ProstoTree<TProstoParserContext | string | 0>({
    children: '_content',
    renderLabel: (node) => {
        if (typeof node === 'string') {
            return styles.text('«' + node.replace(/\n/g, '\\n') + '»')
        } else if (typeof node === 'object') {
            let keys = ''
            Object.keys(node).filter(key => key[0] !== '_' && key !== 'toTree').forEach(key => {
                const val = node[key]
                if (typeof val === 'string') {
                    keys += ' ' + styles.valuesDim(key + '(') + styles.values(val) + styles.valuesDim(')')
                }
            })
            return styles.node((node._icon || '◦') + ' ') + styles.nodeDim(node._label) + keys
        }
        return ''
    },
})

export class ProstoParser<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    protected readonly nodes: Record<IdType, TProstoParseNode<IdType>> = {} as Record<IdType, TProstoParseNode<IdType>>

    protected readonly rootNode: TProstoParseNode<IdType>

    constructor(protected options: TProstoParserOptions<IdType>) {
        options.nodes.forEach(node => {
            if (this.nodes[node.id]) {
                this.panic(`Duplicate Node ID "[${ node.id }]".`)
            }
            this.nodes[node.id] = node
        })
        this.rootNode = this.getNode(this.options.rootNode)
        if (!this.rootNode) {
            this.panic(`Root Node ID "[${ this.options.rootNode }]" not found.`)
        }
    }

    public parse(src: string): TProstoParserContext<IdType> {
        const l = src.length
        let pos = 0
        let index = 0
        let context: TProstoParserContext<IdType> = {
            _index: index,
            _label: this.getLabel(this.rootNode.id),
            _icon: this.rootNode.icon,
            _level: 0,
            _nodeId: this.rootNode.id,
            _content: [],
            toTree: () => parserTree.render(root),
        }
        const root = context
        const stack: TProstoParserContext<IdType>[] = []
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const parser = this

        let node: TProstoParseNode<IdType> = this.rootNode
        let behind: string = ''
        let here: string = src
        interface HoistItems { [index: number]: {options: TProstoParserHoistOptions<IdType>, context: TProstoParserContext<IdType>} }
        type HoistManager = {
            [id in IdType]?: HoistItems
        };
        const hoistManager: HoistManager = {}

        function checkMappedName(key: string, nodeId: IdType) {
            if (['_index', '_level', '_nodeId', '_content'].includes(key)) {
                return parser.panic(`Can not use "${ key }" as mapping key to Node ${ parser.getLabel(nodeId, true) }.`)
            }
        }

        function addHoistOptions(ctx: TProstoParserContext<IdType> = context) {
            const targetNode = parser.getNode(ctx._nodeId)
            if (targetNode.hoistChildren) {
                targetNode.hoistChildren.forEach(options => {
                    const hoist = hoistManager[options.id] = (hoistManager[options.id] || {})
                    checkMappedName(options.as, targetNode.id)
                    if (hoist) {
                        hoist[ctx._index] = {
                            options,
                            context: ctx,
                        }
                    }
                })
            }
        }

        function removeHoistOptions(ctx: TProstoParserContext<IdType> = context) {
            const targetNode = parser.getNode(ctx._nodeId)
            if (targetNode.hoistChildren) {
                targetNode.hoistChildren.forEach(options => {
                    const hoist = hoistManager[options.id]
                    if (hoist) {
                        delete hoist[ctx._index]
                    }
                })
            }
        }

        function processHoistOptions(ctx: TProstoParserContext<IdType> = context) {
            const id = ctx._nodeId
            const hoist = hoistManager[id]
            if (hoist) {
                Object.keys(hoist).map(i => hoist[i as unknown as number]).forEach(({ options, context }) => {
                    if (options.deep === true || Number(options.deep) >= (ctx._level - context._level)) {
                        if (options.asArray) {
                            const hoisted = context[options.as] = (context[options.as] || []) as unknown[]
                            hoisted.push(options.map ? options.map(ctx) : ctx)
                        } else {
                            if (context[options.as]) {
                                parser.panic(`Can not hoist multiple ${ parser.getLabel(ctx._nodeId, true) } to ${ parser.getLabel(context._nodeId, true) } as "${ options.as }". "${ options.as }" already exists.`)
                            } else {
                                context[options.as] = options.map ? options.map(ctx) : ctx
                            }
                        }
                        if (options.removeFromContent) {
                            context._content = context._content.filter(c => c !== ctx) 
                        }
                    }
                })
            }
        }

        function processMapContent(ctx: TProstoParserContext<IdType> = context) {
            const targetNode = parser.getNode(ctx._nodeId)
            if (targetNode.mapContent) {
                Object.keys(targetNode.mapContent).forEach(key => {
                    checkMappedName(key, ctx._nodeId)
                    if (targetNode.mapContent && targetNode.mapContent[key]) {
                        ctx[key] = targetNode.mapContent[key](ctx._content)
                    }
                })
            }
        }

        while (pos < l) {
            let matchedChild: TProstoParseNode<IdType> | undefined
            let matchedToken: string = ''
            let matchRegex: RegExpMatchArray | undefined = undefined
            for (let i = 0; i < node.recognizes.length; i++) {
                const id = node.recognizes[i]
                const n = this.getNode(id)
                if (!n) {
                    this.panic(`Node ${ this.getLabel(id, true) } required by the node ${ this.getLabel(node.id, true) } not found.`)
                }
                const matched = this.lookForStart(behind, here, n)  
                if (matched) {
                    let matchStartConfirmed = true
                    if (matched.node.startsWith?.onMatchToken) {
                        matchStartConfirmed = matched.node.startsWith.onMatchToken(getCallbackData(matched.match))
                    }
                    if (matchStartConfirmed) {
                        matchedChild = matched.node
                        matchedToken = matched.match[0]
                        matchRegex = matched.match
                        break
                    }
                }
            }
            if (matchedChild) {
                let toAppend = ''
                if (matchedChild.startsWith?.eject) {
                    appendContent(matchedToken)
                    jump(matchedToken.length)
                } else if (matchedChild.startsWith?.omit) {
                    jump(matchedToken.length)
                } else {
                    toAppend = src[pos]
                    jump()
                }
                push({
                    _nodeId: matchedChild.id,
                    _icon: matchedChild.icon,
                    _content: toAppend ? [toAppend] : [],
                })
                if (matchedChild.onMatch) {
                    matchedChild.onMatch(getCallbackData(matchRegex))
                }
                continue
            }
            const matchedEnd = this.lookForEnd(behind, here, node)
            if (matchedEnd) {
                matchedToken = matchedEnd[0]
                let matchEndConfirmed = true
                if (node.endsWith?.onMatchToken) {
                    matchEndConfirmed = node.endsWith.onMatchToken(getCallbackData(matchedEnd))
                }
                if (matchEndConfirmed) {
                    if (node.endsWith?.eject) {
                        pop()
                    } else if (node.endsWith?.omit) {
                        jump(matchedToken.length)
                        pop()
                    } else {
                        appendContent(matchedToken)
                        jump(matchedToken.length)
                        pop()
                    }
                    continue
                }
            }
            appendContent(src[pos])
            jump()
        }

        if (context !== root) {
            while (node.popsAtEOFSource && stack.length > 0) pop()
        }

        if (context !== root) {
            this.panic(`Unexpected end of the source string while parsing ${ this.getLabel(context._nodeId, true) } (${ context._index }) node.\n${ JSON.stringify(context._content) }`)
        }

        return root

        function push(newContext: Partial<TProstoParserContext<IdType>>) {
            index++
            const ctx = { 
                _index: index,
                _level: stack.length + 1,
                _label: parser.getLabel(newContext._nodeId as IdType),
                ...newContext,
            } as TProstoParserContext<IdType>
            context._content.push(ctx)
            stack.push(context)
            addHoistOptions(context)
            context = ctx
            node = parser.getNode(context._nodeId)
        }

        function jump(n: number = 1): number {
            pos += n
            behind = src.slice(0, pos)
            here = src.slice(pos, l)
            return pos
        }
        
        function pop() {
            let thisNode = parser.getNode(context._nodeId)
            let parentContext = stack.pop()
            processMappings(context)
            if (thisNode.onPop) {
                thisNode.onPop(getCallbackData())
            }
            if (parentContext) {
                mergeIfRequired()
                let popsAfter = getPopsAfter()
                while (!!parentContext && (popsAfter.includes(thisNode.id))) {
                    context = parentContext
                    thisNode = parser.getNode(context._nodeId)
                    if (parentContext) {
                        mergeIfRequired()
                        parentContext = stack.pop()                    
                        popsAfter = getPopsAfter()
                    }
                    processMappings(context)
                    if (thisNode.onPop) {
                        thisNode.onPop(getCallbackData())
                    }
                }
            }

            if (parentContext) {
                context = parentContext
            } else {
                // end
            }

            node = parser.getNode(context._nodeId)

            function removeLastZero(ctx: TProstoParserContext) {
                const len = ctx._content.length
                if (ctx._content[len - 1] === 0) {
                    ctx._content = ctx._content.slice(0, len - 1)
                }
            }

            function mergeIfRequired() {
                if (parentContext && thisNode.mergeWith) {
                    const parentNode = parser.getNode(parentContext._nodeId)
                    for (let i = 0; i < thisNode.mergeWith.length; i++) {
                        const { parent, join } = thisNode.mergeWith[i]
                        const mergeWith = [parent].flat()
                        if (mergeWith[0] === '*' || mergeWith.includes(parentNode.id)) {
                            parentContext._content = parentContext._content.slice(0, parentContext._content.length - 1)
                            if (join) {
                                if (context._content.length === 1 && typeof context._content[0] === 'string') {
                                    appendContent(context._content[0], parentContext)
                                } else {
                                    appendContent(context._content, parentContext)
                                }
                            } else {
                                parentContext._content.push(...context._content, 0)
                            }
                            return
                        }
                    }
                }
                // we're not merging anymore, so the last zero is useless
                removeLastZero(context)
            }          
            function getPopsAfter() {
                if (parentContext) {
                    const parentNode = parser.getNode(parentContext._nodeId)
                    return parentNode.popsAfterNode ? [parentNode.popsAfterNode].flat() : []
                }
                return []
            }
            function processMappings(ctx: TProstoParserContext<IdType>) {
                removeHoistOptions(ctx)
                processHoistOptions(ctx)
                processMapContent(ctx)
            }
        }

        function getCallbackData(matched?: RegExpMatchArray): TPorstoParserCallbackData<IdType> {
            return {
                context,
                matched,
                stack,
                parent: parser.getNode(stack[stack.length - 1]?._nodeId),
                pos,
                src,
                behind,
                here,
                jump,
                appendContent,
                pop,
                push,
                error: (s: string) => parser.panic(s),
            }
        }

        function appendContent(input: string | TProstoParserContext['_content'], ctx = context) {
            let s = input
            const node = parser.getNode(ctx._nodeId)
            if (typeof s === 'string' && node.skipToken) {
                const matched = parser.lookFor('', s, {
                    token: node.skipToken,
                })
                if (matched) {
                    return jump(matched[0].length - 1)
                }
            }
            if (node.onAppendContent) {
                s = node.onAppendContent(input, getCallbackData())
            }
            const len = ctx._content.length
            const contentLast = ctx._content[len - 1]
            if (typeof contentLast === 'string') {
                if (typeof s === 'string') {
                    ctx._content[len - 1] += s
                } else {
                    ctx._content.push(...s)
                }
                return
            } else if (contentLast === 0) {
                ctx._content = ctx._content.slice(0, len - 1)
            }
            if (typeof s === 'string') {
                ctx._content.push(s)
            } else {
                ctx._content.push(...s)
            }
        }
    }

    protected lookForStart(behind: string, here: string, node: TProstoParseNode<IdType>): {node: TProstoParseNode<IdType>, match: RegExpMatchArray} | undefined {
        if (node.startsWith) {
            const match = this.lookFor(behind, here, node.startsWith)
            return match ? { node, match } : undefined
        }
    }

    protected lookForEnd(behind: string, here: string, node: TProstoParseNode<IdType>): RegExpMatchArray | undefined {
        if (node.endsWith) {
            return this.lookFor(behind, here, node.endsWith)
        }
    }    

    protected lookFor(behind: string, here: string, tokenDescriptor: TProstoParserTokenDescripor<IdType>): RegExpMatchArray | undefined {
        const { token, negativeLookBehind, negativeLookAhead } = tokenDescriptor
        if ((!negativeLookBehind || !behind.match(negativeLookBehind)) && (!negativeLookAhead || !here.slice(1).match(negativeLookAhead))) {
            if (typeof token === 'string' || Array.isArray(token)) {
                const arrayOfTokens = (typeof token === 'string' ? [token] : token)
                for (let j = 0; j < arrayOfTokens.length; j++) {
                    const startsWithToken = arrayOfTokens[j]
                    if (here.startsWith(startsWithToken)) {
                        return [startsWithToken]
                    }
                }
            } else if (token) {
                const match = here.match(token)
                if (match) {
                    return match
                }
            }
        }
    }

    public getNode(id: IdType) {
        return this.nodes[id]
    }

    public getLabel(id: IdType, quoted = false) {
        const quotes = quoted ? '"' : ''
        const label = this.getNode(id)?.label
        return quotes + (!quoted && typeof label === 'string' || label ? label : `[${id}]`) + quotes
    }

    protected panic(message: string) {
        console.error(banner + __DYE_RED_BRIGHT__, message, __DYE_RESET__)
        throw new Error(message)
    }
}
