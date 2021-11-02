import { ProstoParserNode, TDefaultCustomDataType, TGenericCustomDataType, TProstoParserNodeOptions } from '..'

export class GenericXmlInnerNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNode<T> {
    constructor(options?: TProstoParserNodeOptions) {
        super({
            label: 'inner',
            startsWith: { token: '>', omit: true },
            endsWith: { token: '</', eject: true },
            ...( options || {} ),
        })
    }
}
