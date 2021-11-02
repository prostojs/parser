import { ProstoParserNode, TProstoParserNodeOptions } from '..'
import { escapeRegex } from '../utils'

interface TAttributeCustomData {
    key: string
    value: string
}

interface TGenericXmlAttributeNodeOptions {
    valueNode: ProstoParserNode
    notNull?: boolean
    prefix?: string
    options?: TProstoParserNodeOptions
}

export class GenericXmlAttributeNode<T extends TAttributeCustomData> extends ProstoParserNode<T> {
    constructor(options?: TGenericXmlAttributeNodeOptions) {
        super({
            label: 'attribute',
            icon: '=',
            startsWith: {
                token: options?.prefix
                    ? new RegExp('^' + escapeRegex(options?.prefix) + '([\\w:\\-\\.]+)')
                    : /^([\w:\-\.]+)/,
                omit: true,    
            },
            endsWith: {
                token: /^[\s\n\/>]/,
                eject: true,
            },
            onMatch({ customData, matched }) {
                customData.key = matched[1]
            },
            goodToken: /^[\w:\-\.]/i,
            hoistChildren: options?.valueNode ? [
                {
                    node: options?.valueNode,
                    as: 'value',
                    removeFromContent: true,
                    deep: 1,
                    map: ({ content }) => content.join(''),
                },
            ] : [],
            onPop({ customData, parserContext }) {
                if (options?.notNull && typeof customData.value === 'undefined') {
                    parserContext.panic(`Interpolation attribute "${ customData.key }" must have value.`)
                }
            },
            popsAfterNode: options?.valueNode ? [options?.valueNode] : [],
            recognizes: options?.valueNode ? [options?.valueNode] : [],
            ...(options || {}),
        })
    }
}
