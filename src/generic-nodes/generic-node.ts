import { ProstoParserNode } from '..'

interface TGenericNodeOptions {
    label?: string,
    icon?: string,
    startToken: string | RegExp,
    endToken: string | RegExp,
}

export class GenericNode extends ProstoParserNode {
    constructor(options: TGenericNodeOptions) {
        super({
            icon: options.icon || '·',
            label: options.label || 'Node',
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
