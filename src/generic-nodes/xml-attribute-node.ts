import { GenericNode } from '.'
import { ProstoParserNode } from '..'
import { escapeRegex } from '../utils'

type TGenericAttributeCustomData = {
    key: string
    value: string
}

interface TGenericXmlAttributeNodeOptions {
    valueNode: ProstoParserNode
    notNull?: boolean
    prefix?: string
}

export class GenericXmlAttributeNode<T extends TGenericAttributeCustomData = TGenericAttributeCustomData> extends GenericNode<T> {
    constructor(options?: TGenericXmlAttributeNodeOptions) {
        const startToken = options?.prefix
            ? new RegExp(`(?<prefix>${ escapeRegex(options?.prefix) })(?<key>[\\w:\\-\\.]+)`)
            : /(?<key>[\w:\-\.]+)/
        super({
            label: 'attribute',
            icon: '=',
            tokens: [startToken, /[\s\n\/>]/],
            tokenOptions: 'omit-eject',
        })
        this.badToken = /[^\w:\-\.]/
        if (options?.valueNode) {
            this.addHoistChildren({
                node: options?.valueNode,
                as: 'value',
                removeChildFromContent: true,
                deep: 1,
                map: ({ content }) => content.join(''),
            })
                .addPopsAfterNode(options.valueNode)
                .addRecognizes(options.valueNode)
        }
        this.onPop(({ customData, parserContext }) => {
            if (options?.notNull && typeof customData.value === 'undefined') {
                parserContext.panic(`Interpolation attribute "${ customData.key }" must have value.`)
            }
        })
    }
}
