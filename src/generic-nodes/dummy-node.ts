import { ProstoParserNode } from '..'

interface TGenericDummyNodeOptions {
    label?: string,
    icon?: string,
    startToken: string,
    endToken: string,
}

export class GenericDummyNode extends ProstoParserNode {
    constructor(options: TGenericDummyNodeOptions) {
        super({
            icon: options.icon || '·',
            label: options.label || 'Dummy',
            startsWith: {
                token: options.startToken,
                omit: true,
            },
            endsWith: {
                token: options.endToken,
                omit: true,
            },
            recognizes: [],
        })
    }
}
