import { ProstoParserNode, TProstoParserNodeOptions } from '..'

export class GenericRootNode extends ProstoParserNode {
    constructor(options?: TProstoParserNodeOptions) {
        super({
            icon: 'ROOT',
            label: '',
            ...options,
        })
    }
}
