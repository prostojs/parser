import { GenericNode } from '.'
import { TDefaultCustomDataType, TGenericCustomDataType } from '..'

export interface TInnerOptions {
    label?: string
    icon?: string
    trim?: boolean
}

export class GenericXmlInnerNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends GenericNode<T> {
    constructor(options?: TInnerOptions) {
        super({
            label: options?.label || '',
            icon: options?.icon || '',
            tokens: ['>', '</'],
            tokenOptions: 'omit-eject',
        })
        if (options?.trim) {
            this.onAppendContent((s) => {
                if (typeof s === 'string') {
                    return s.trim().replace(/\n/g, ' ').replace(/\s+/, ' ')
                }
                return s
            })
        }
    }
}
