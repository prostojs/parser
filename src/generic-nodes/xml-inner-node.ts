import { ProstoParserNode, TDefaultCustomDataType, TGenericCustomDataType } from '..'

export interface TInnerOptions {
    label?: string
    icon?: string
    trim?: boolean
}

export class GenericXmlInnerNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNode<T> {
    constructor(options?: TInnerOptions) {
        super({
            label: options?.label || '',
            icon: options?.icon || '',
            startsWith: { token: '>', omit: true },
            endsWith: { token: '</', eject: true },
            onAppendContent: options?.trim ? (s) => {
                if (typeof s === 'string') {
                    return s.trim().replace(/\n/g, ' ').replace(/\s+/, ' ')
                }
                return s
            } : undefined,
        })
    }
}
