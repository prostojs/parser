import { ProstoParserNode, TDefaultCustomDataType, TGenericCustomDataType, TProstoParserNodeOptions, TProstoParserTokenDescripor } from '..'

type TOmit = 'omit'
type TEject = 'eject'
type TBackSlashIgnore = 'ignore'
export type TOmitEjectShortcut = '' | `${ TOmit | TEject | '' }-${ TOmit | TEject | '' }`
export type TBackSlashShortcut = '' | `${ TBackSlashIgnore | '' }-${ TBackSlashIgnore | '' }`

export interface TGenericNodeOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    label?: string,
    icon?: string,
    tokens: [TProstoParserTokenDescripor<T>['token'], TProstoParserTokenDescripor<T>['token']]
    tokenOptions?: TOmitEjectShortcut
    backSlash?: TBackSlashShortcut
    initCustomData?: TProstoParserNodeOptions['initCustomData']
}

export class GenericNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNode<T> {
    constructor(options: TGenericNodeOptions<T>) {
        const startsWith: TProstoParserTokenDescripor = { token: options.tokens[0] }
        const endsWith: TProstoParserTokenDescripor = { token: options.tokens[1] }
        const [startOption, endOption] = options.tokenOptions?.split('-') || []
        const [startBSlash, endBSlash] = options.backSlash?.split('-') || []
        startsWith.omit = startOption === 'omit'
        startsWith.eject = startOption === 'eject'
        endsWith.omit = endOption === 'omit'
        endsWith.eject = endOption === 'eject'
        startsWith.ignoreBackSlashed = startBSlash === 'ignore'
        endsWith.ignoreBackSlashed = endBSlash === 'ignore'
        super({
            icon: options.icon || '',
            label: typeof options.label === 'string' ? options.label : 'Node',
            startsWith,
            endsWith,
        })
    }
}
