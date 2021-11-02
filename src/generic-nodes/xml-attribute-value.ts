import { GenericStringNode, TGenericStringNodeCustomData } from './string-node'

export class GenericXmlAttributeValue<T extends TGenericStringNodeCustomData> extends GenericStringNode<T> {
    constructor(allowUnquoted = false) {
        super(['"', '`'], 'omit-omit')
        const token = ['="', '=\'']
        if (allowUnquoted) token.push('=')
        if (this.startsWith) {
            this.startsWith.token = token
        }
        this.onMatch(({ matched, customData, context }) => {
            customData.quote = matched[0][1]
            if (!customData.quote) {
                context.endsWith = {
                    token: /[\s\/>]/,
                    eject: true,
                }
            }
        })
    }
}
