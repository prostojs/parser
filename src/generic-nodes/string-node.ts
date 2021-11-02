import { ProstoParserNode } from '..'

export type TGenericStringNodeCustomData = {
    quote: string
}

export class GenericStringNode<T extends TGenericStringNodeCustomData> extends ProstoParserNode<T> {
    constructor(token = ['"', '\'', '`'], omit = false) {
        super({
            label: '',
            icon: '"',
            startsWith: {
                token,
                omit,
            },
            onMatch: ({ matched, customData }) => customData.quote = matched[0],
            endsWith: {
                token,
                omit,
                ignoreBackSlashed: true,
                onMatchToken: ({ matched, customData }) => matched[0] === customData.quote,
            },
        })
    }
}
