import { ProstoParserNode, TProstoParserNodeOptions } from '..'

export class GenericXmlInnerNode<T = unknown> extends ProstoParserNode<T> {
    constructor(options?: TProstoParserNodeOptions) {
        super({
            label: 'inner',
            startsWith: { token: '>', omit: true },
            endsWith: { token: '</', eject: true },
            ...( options || {} ),
        })
    }
}
