import { ProstoParserNode } from '..'

type TGenericStringExpressionCustomData = {
    expression: string
}

export class GenericStringExpressionNode<T extends TGenericStringExpressionCustomData> extends ProstoParserNode<T> {
    constructor(stringNode?: ProstoParserNode, delimiters = ['{{', '}}']) {
        super({
            label: 'string',
            icon: '≈',
            startsWith: {
                token: delimiters[0],
                omit: true,
            },
            endsWith: {
                token: delimiters[1],
                omit: true,
            },
            onPop({ context, customData }) {
                customData.expression = context.content.join('')
                context.content = []
            },            
            recognizes: stringNode ? [stringNode] : [],
        })
        stringNode?.addMergeWith({
            parent: this,
            join: true,
        })
    }
}
