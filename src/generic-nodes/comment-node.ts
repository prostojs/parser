import { ProstoParserNode, TProstoParserNodeOptions } from '..'

interface TGenericCommentNodeOptions {
    block: boolean
    delimiters: string | [string, string]
    options?: TProstoParserNodeOptions
}

export class GenericCommentNode extends ProstoParserNode {
    constructor({ block, delimiters, options }: TGenericCommentNodeOptions) {
        const startToken = typeof delimiters === 'string' ? delimiters : delimiters[0]
        const endToken = typeof delimiters === 'string' ? delimiters : delimiters[1]
        super({
            label: __DYE_WHITE__ + __DYE_DIM__ + 'comment',
            icon: __DYE_WHITE__ + __DYE_DIM__ + '“',
            startsWith: {
                token: startToken,
                omit: true,
            },
            endsWith: block ? {
                token: endToken,
                omit: true,
            } : {
                token: '\n',
                omit: true,
            },
            onAppendContent(s, { context, rootContext }) {
                const options = context.getOptions()
                if (typeof s === 'string' && !options.recognizes.length) {
                    // jump to the end
                    const end = typeof options.endsWith?.token === 'string' ? rootContext.here.indexOf(options.endsWith.token) : -1
                    if (end >= 0) {
                        return rootContext.here.slice(0, end)
                    }
                }
                return s
            },
            ...options,
        })
    }
}
