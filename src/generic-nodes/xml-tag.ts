import { ProstoParserNode, ProstoParserNodeContext } from '..'
import { escapeRegex } from '../utils'

export type TGenericTagCustomData = {
    tag: string
    endTag: string | null
    isVoid: boolean
    isText: boolean
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
}

export class GenericXmlTagNode<T extends TGenericTagCustomData> extends ProstoParserNode<T> {
    constructor(options: TGenericXmlTagOptions) {
        const voidTags = options?.voidTags || htmlVoidTags
        const textTags = options?.textTags || htmlTextTags
        let token: string | RegExp = /<(?<tag>[\w:\-\.]+)/
        if (options?.tag) {
            token = `<(?<tag>${ escapeRegex(options.tag) })[\s>]`
        }
        super({
            label: '',
            icon: options?.tag || '<>',
            skipToken: /\s/,
            badToken: /[^\s]/,
            startsWith: {
                token: token,
                omit: true,
            },
            endsWith: {
                token: (context) => {
                    const cd = (context as ProstoParserNodeContext<T>).getCustomData()
                    if (cd.isVoid || cd.isText) {
                        return /\/?\>/
                    }
                    return /(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/
                },
                omit: true,
                onMatchToken: ({ matched, customData, context, parserContext }) => {
                    if (customData.isText) {
                        context.endsWith = {
                            token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`),
                            omit: true,
                        }
                        context.clearRecognizes()
                        context.clearSkipToken()
                        context.clearBadToken()
                        parserContext.jump(matched.length)
                        return false
                    }
                },
            },
            onMatch({ context, customData }) {
                context.icon = customData.tag
                if (voidTags.includes(customData.tag)) {
                    // this is void tag
                    customData.isVoid = true
                    context.recognizes = context.recognizes.filter(r => r !== options.innerNode)
                } else if (textTags.includes(customData.tag) && context.endsWith) {
                    // this is text tag
                    customData.isText = true
                    context.recognizes = context.recognizes.filter(r => r !== options.innerNode)
                }
            },
            onAfterChildParse(childContext) {
                if (childContext.node === options.innerNode) {
                    // after inner we ain't going to have anything
                    // to parse in this node
                    childContext.recognizes = []
                }
            },
            onPop({ parserContext, customData }) {
                if (
                    !customData.isVoid &&
                    typeof customData.endTag === 'string' &&
                    customData.tag !== customData.endTag
                ) {
                    parserContext.panicBlock(
                        `Open tag <${ customData.tag }> and closing tag </${ customData.endTag }> must be equal.`,
                        customData.tag.length,
                        customData.endTag.length + 1,
                    )
                }
            },
            recognizes: [options.innerNode],
        })
    }
}
