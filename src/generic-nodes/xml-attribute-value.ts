import { GenericStringNode, TGenericStringNodeCustomData } from './string-node'

export class GenericXmlAttributeValue<T extends TGenericStringNodeCustomData> extends GenericStringNode<T> {
    constructor() {
        super(['"', '`'], true)
        if (this.options.startsWith) {
            this.options.startsWith.token = ['="', '=\'', '=']
        }
        this.options.onMatch = ({ matched, customData, context }) => {
            customData.quote = matched[0][1]
            if (!customData.quote) {
                const options = context.getOptions()
                options.endsWith = {
                    token: /^[\s\/>]/,
                    eject: true,
                }
            }
        }
    }
}
