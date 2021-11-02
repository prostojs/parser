import { GenericNode } from './generic-node'
import { ProstoParserNode } from '..'

type TGenericStringExpressionCustomData = {
    expression: string
}

export class GenericStringExpressionNode<T extends TGenericStringExpressionCustomData> extends GenericNode<T> {
    constructor(stringNode?: ProstoParserNode, delimiters = ['{{', '}}']) {
        super({
            label: 'string',
            icon: '≈',
            tokens: [delimiters[0], delimiters[1]],
            tokenOptions: 'omit-omit',
        })
        this.mapContent('expression', content => { 
            const expression = content.join('')
            content.splice(0, content.length)
            return expression
        })
        if (stringNode) {
            this.addRecognizes(stringNode)
            stringNode.addMergeWith({
                parent: this,
                join: true,
            })
        }
    }
}
