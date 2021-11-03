import { GenericNode, TOmitEjectShortcut } from '.'
import { ProstoParserNodeContext } from '..'

export interface TGenericStringNodeCustomData {
    quote?: string
}

export class GenericStringNode<T extends TGenericStringNodeCustomData = TGenericStringNodeCustomData> extends GenericNode<T> {
    constructor(token = ['"', '\'', '`'], tokenOptions: TOmitEjectShortcut = '') {
        type Context = ProstoParserNodeContext<T>

        super({
            label: '',
            icon: '"',
            tokens: [token, context => (context as Context).getCustomData().quote || '' ],
            tokenOptions,
            backSlash: '-ignore',
        })
        this.onMatch(({ matched, customData }) => customData.quote = matched[0])
    }
}
