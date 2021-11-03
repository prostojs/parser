import { GenericNode } from '.'
import { ProstoParserNodeContext, TDefaultCustomDataType, TGenericCustomDataType } from '..'

export interface TInnerOptions {
    label?: string
    icon?: string
    trim?: boolean
}

export class GenericXmlInnerNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends GenericNode<T> {
    private innerOptions: TInnerOptions | undefined

    constructor(innerOptions?: TInnerOptions) {
        super({
            label: innerOptions?.label || '',
            icon: innerOptions?.icon || '',
            tokens: ['>', '</'],
            tokenOptions: 'omit-eject',
        })

        this.innerOptions = innerOptions
    }

    beforeOnAppendContent(s: string | ProstoParserNodeContext<T>['content']) {
        if (this.innerOptions?.trim) {
            if (typeof s === 'string') {
                return s.trim().replace(/\n/g, ' ').replace(/\s+/, ' ')
            }
        }
        return s
    }
}
