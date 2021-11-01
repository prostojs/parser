import { ProstoParserNode, TProstoParserTokenDescripor } from '..'
import { escapeRegex } from '../utils'

interface TTagCustomData {
    tag: string
    endTag: string | null
    isVoid: boolean
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

interface TGenericXmlTagOptions {
    innerNode: ProstoParserNode,
    voidTags?: string[]
    tag?: string
}

const voidEnd: TProstoParserTokenDescripor<unknown> = {
    token: /^\/?\>/,
    omit: true,
}

export class GenericXmlTagNode<T extends TTagCustomData> extends ProstoParserNode<T> {
    constructor(options: TGenericXmlTagOptions) {
        const voidTags = options?.voidTags || htmlVoidTags
        let token: string | RegExp = /^<([^\s\>\/]+)/
        if (options?.tag) {
            token = `^<(${ escapeRegex(options.tag) })`
        }
        super({
            label: '',
            startsWith: {
                token: token,
                omit: true,
            },
            icon: options?.tag || '<>',
            onMatch({ matched, context, customData }) {
                customData.tag = matched[1]
                context.icon = matched[1]
                if (voidTags.includes(matched[1])) {
                    // this is void tag
                    customData.isVoid = true
                    context.getOptions().endsWith = voidEnd as TProstoParserTokenDescripor<T>
                    context.getOptions().recognizes = context.getOptions().recognizes.filter(r => r !== options.innerNode)
                }
            },
            endsWith: {
                token: /^(?:\/\>|\<\/(\w+)\s*\>)/,
                omit: true,
                onMatchToken: ({ matched, customData }) => {
                    customData.endTag = matched[1]
                    return true
                },
            },
            // skipToken: /^\s+/,
            badToken: /[^\s]/,
            onPop({ rootContext, customData }) {
                if (
                    !customData.isVoid &&
                    typeof customData.endTag === 'string' &&
                    customData.tag !== customData.endTag
                ) {
                    rootContext.panicBlock(
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
