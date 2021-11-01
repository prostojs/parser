import { ProstoParserNode } from '..'
import { negativeLookBehindEscapingSlash } from '../constants'

export interface TGenericStringNodeCustomData {
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
                negativeLookBehind: negativeLookBehindEscapingSlash,
                onMatchToken: ({ matched, customData }) => matched[0] === customData.quote,
            },
        })
    }
}
