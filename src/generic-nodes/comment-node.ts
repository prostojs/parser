import { TProstoParserNodeOptions } from '..'
import { ProstoParserNode } from '../model/node'

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
            onAppendContent(s, { context, parserContext }) {
                if (typeof s === 'string' && !context.recognizes.length) {
                    // jump to the end
                    const end = typeof context.endsWith?.token === 'string' ? parserContext.here.indexOf(context.endsWith.token) : -1
                    if (end >= 0) {
                        const newS = parserContext.here.slice(0, end)
                        parserContext.jump(Math.max(newS.length - s.length, 0))
                        return newS
                    }
                }
                return s
            },
            ...options,
        })
    }
}
