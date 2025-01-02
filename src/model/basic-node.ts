import { ProstoParserNode, TDefaultCustomDataType, TGenericCustomDataType, TProstoParserNodeOptions, TProstoParserTokenDescripor } from '..'

type TOmit = 'omit'
type TEject = 'eject'
type TConsume = 'consume'
type TBackSlashIgnore = 'ignore'
export type TOmitEjectShortcut = '' | `${ TOmit | TEject | TConsume | '' }-${ TOmit | TEject | TConsume | '' }`
export type TBackSlashShortcut = '' | `${ TBackSlashIgnore | '' }-${ TBackSlashIgnore | '' }`

export interface TBasicNodeOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    label?: string,
    icon?: string,
    tokens?: [TProstoParserTokenDescripor<T>['token'], TProstoParserTokenDescripor<T>['token']]
    tokenOE?: TOmitEjectShortcut
    backSlash?: TBackSlashShortcut
    badToken?: TProstoParserNodeOptions['badToken'],
    skipToken?: TProstoParserNodeOptions['skipToken'],
    recursive?: boolean
}

export class BasicNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNode<T> {
    constructor(options: TBasicNodeOptions<T>) {
        const startsWith: TProstoParserTokenDescripor | undefined = options?.tokens ? { token: options?.tokens[0] } : undefined
        const endsWith: TProstoParserTokenDescripor | undefined = options?.tokens ? { token: options?.tokens[1] } : undefined
        const [startOption, endOption] = options.tokenOE?.split('-') || []
        const [startBSlash, endBSlash] = options.backSlash?.split('-') || []
        if (startsWith) {
            startsWith.omit = startOption === 'omit'
            startsWith.eject = startOption === 'eject'
            startsWith.consume = startOption === 'consume'
            startsWith.ignoreBackSlashed = startBSlash === 'ignore'
        }
        if (endsWith) {
            endsWith.omit = endOption === 'omit'
            endsWith.eject = endOption === 'eject'
            endsWith.consume = endOption === 'consume'
            endsWith.ignoreBackSlashed = endBSlash === 'ignore'
        }
        super({
            icon: options.icon || '',
            label: typeof options.label === 'string' ? options.label : '',
            startsWith,
            endsWith,
            badToken: options.badToken,
            skipToken: options.skipToken,
        })
        if (options.recursive) {
            this.addAbsorbs(this, 'join')
        }
    }
}
