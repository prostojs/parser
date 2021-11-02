import { GenericNode } from './generic-node'
import { TDefaultCustomDataType, TGenericCustomDataType } from '..'

interface TGenericCommentNodeOptions {
    block: boolean
    delimiters: string | [string, string]
    label?: string
    icon?: string
}

export class GenericCommentNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends GenericNode<T> {
    constructor({ block, delimiters, label, icon }: TGenericCommentNodeOptions) {
        const startToken = typeof delimiters === 'string' ? delimiters : delimiters[0]
        const endToken = typeof delimiters === 'string' ? delimiters : delimiters[1]
        super({
            label: label || __DYE_WHITE__ + __DYE_DIM__ + 'comment',
            icon: icon || __DYE_WHITE__ + __DYE_DIM__ + '“',
            tokens: [startToken, block ? endToken : /$/m],
            tokenOptions: 'omit-omit',
        })
    }
}
