import { GenericNode } from '.'
import { ProstoParserNode } from '..'
import { escapeRegex } from '../utils'

export type TGenericTagCustomData = {
    tag: string
    endTag: string | null
    isVoid: boolean
    isText: boolean
    prefix?: string
}

const htmlVoidTags = [
    'area',
    'base',
    'br',
    'col',
    'command',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]

const htmlTextTags = [
    'script',
    'style',
]

export interface TGenericXmlTagOptions {
    innerNode: ProstoParserNode,
    voidTags?: string[]
    textTags?: string[]
    tag?: string
    prefix?: string
}

export class GenericXmlTagNode<T extends TGenericTagCustomData = TGenericTagCustomData> extends GenericNode<T> {
    constructor(options: TGenericXmlTagOptions) {
        const voidTags = options?.voidTags || htmlVoidTags
        const textTags = options?.textTags || htmlTextTags
        const pre = options.prefix ? `(?<prefix>${ escapeRegex(options.prefix) })` : ''
        let startToken: (string | RegExp) = new RegExp(`<${ pre }(?<tag>[\\w:\\-\\.]+)`)
        if (options?.tag) {
            startToken = `<${ pre }(?<tag>${ escapeRegex(options.tag) })[\s>]`
        }
        super({
            label: '',
            icon: options?.tag || '<>',
            tokens: [
                startToken,
                ({ customData: { isVoid, isText } }) => (isVoid || isText) ? /\/?\>/ :/(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/,
            ],
            tokenOptions: 'omit-omit',
        })

        this.badToken = /[^\s]/
        this.skipToken = /\s/

        this.onMatchEndToken(({ matched, customData, context, parserContext }) => {
            if (customData.isText) {
                context.endsWith = {
                    token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`),
                    omit: true,
                }
                context.clearRecognizes().clearSkipToken().clearBadToken()
                parserContext.jump(matched.length)
                // we're not goind to end parsing this node
                // returning false
                return false
            }
        }).onMatch(({ context, customData }) => {
            context.icon = customData.tag
            customData.isVoid = voidTags.includes(customData.tag)
            customData.isText = textTags.includes(customData.tag)
            if (customData.isVoid || customData.isText) {
                // no need to parse inner in isText or isVoid cases
                context.recognizes = context.recognizes.filter(r => r !== options.innerNode)
            }
        })
        //                                                             after inner we ain't going to have anything
        //                                                             to parse in this node
            .onAfterChildParse((childContext) => childContext.node === options.innerNode ? childContext.clearRecognizes() : null)
            .onPop(({ parserContext, customData }) => {
                if (
                    !customData.isVoid &&
                typeof customData.endTag === 'string' &&
                ((customData.prefix || '') + customData.tag) !== customData.endTag
                ) {
                    parserContext.panicBlock(
                        `Open tag <${ customData.tag }> and closing tag </${ customData.endTag }> must be equal.`,
                        customData.tag.length,
                        customData.endTag.length + 1,
                    )
                }
            }).addRecognizes(options.innerNode)
    }
}
