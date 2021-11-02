import { GenericStringNode, TGenericStringNodeCustomData } from './string-node'

export class GenericXmlAttributeValue<T extends TGenericStringNodeCustomData> extends GenericStringNode<T> {
    constructor(allowUnquoted = false) {
        super(['"', '`'], true)
        const token = ['="', '=\'']
        if (allowUnquoted) token.push('=')
        if (this.options.startsWith) {
            this.options.startsWith.token = token
        }
        this.options.onMatch = ({ matched, customData, context }) => {
            customData.quote = matched[0][1]
            if (!customData.quote) {
                context.endsWith = {
                    token: /[\s\/>]/,
                    eject: true,
                }
            }
        }
    }
}
