import { ProstoParserNode, TDefaultCustomDataType, TGenericCustomDataType, TProstoParserNodeOptions } from '..'

export class GenericRootNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNode<T> {
    constructor(options?: TProstoParserNodeOptions<T>) {
        super({
            icon: 'ROOT',
            label: '',
            ...options,
        })
    }
}
