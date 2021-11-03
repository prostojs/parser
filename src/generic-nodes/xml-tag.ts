import { GenericNode } from '.'
import { ProstoParserNode, ProstoParserNodeContext, TPorstoParserCallbackData, TPorstoParserCallbackDataMatched } from '..'
import { escapeRegex } from '../utils'

export interface TGenericTagCustomData {
    tag?: string
    endTag?: string | null
    isVoid?: boolean
    isText?: boolean
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
    private voidTags: string[]

    private textTags: string[]

    private tagOptions: TGenericXmlTagOptions

    constructor(tagOptions: TGenericXmlTagOptions) {
        const pre = tagOptions.prefix ? `(?<prefix>${ escapeRegex(tagOptions.prefix) })` : ''
        let startToken: (string | RegExp) = new RegExp(`<${ pre }(?<tag>[\\w:\\-\\.]+)`)
        if (tagOptions?.tag) {
            startToken = `<${ pre }(?<tag>${ escapeRegex(tagOptions.tag) })[\s>]`
        }
        super({
            label: '',
            icon: tagOptions?.tag || '<>',
            tokens: [
                startToken,
                ({ customData: { isVoid, isText } }) => (isVoid || isText) ? /\/?\>/ :/(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/,
            ],
            tokenOptions: 'omit-omit',
        })

        this.tagOptions = tagOptions
        this.voidTags = tagOptions?.voidTags || htmlVoidTags
        this.textTags = tagOptions?.textTags || htmlTextTags

        this.badToken = /[^\s]/
        this.skipToken = /\s/

        this.onMatchEndToken(({ matched, customData, context, parserContext }) => {
            if (customData.isText) {
                context.endsWith = {
                    token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag || '') })\\s*>`),
                    omit: true,
                }
                context.clearRecognizes().clearSkipToken().clearBadToken()
                parserContext.jump(matched.length)
                // we're not goind to end parsing this node
                // returning false
                return false
            }
        })
            .addRecognizes(tagOptions.innerNode)
    }

    public beforeOnAfterChildParse(child: ProstoParserNodeContext) {
        // after inner we ain't going to have anything
        // to parse in this node
        return child.node === this.tagOptions.innerNode ? child.clearRecognizes() : null
    }

    public beforeOnMatch(data: TPorstoParserCallbackDataMatched<T>) {
        const { context } = data
        const customData = context.getCustomData<T>()
        context.icon = customData.tag || ''
        customData.isVoid = this.voidTags.includes(customData.tag || '')
        customData.isText = this.textTags.includes(customData.tag || '')
        if (customData.isVoid || customData.isText) {
            // no need to parse inner in isText or isVoid cases
            context.recognizes = context.recognizes.filter(r => r !== this.tagOptions.innerNode)
        }
    }

    public beforeOnPop(data: TPorstoParserCallbackData<T>) {
        const { parserContext, customData } = data
        if (
            !customData.isVoid &&
        typeof customData.endTag === 'string' &&
        ((customData.prefix || '') + (customData.tag || '')) !== customData.endTag
        ) {
            parserContext.panicBlock(
                `Open tag <${ customData.tag || '' }> and closing tag </${ customData.endTag }> must be equal.`,
                customData.tag?.length || 0,
                customData.endTag.length + 1,
            )
        }
    }
}
