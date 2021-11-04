import { ProstoParserNode } from './model/node'
import { ProstoParserNodeContext } from './model/node-context'
import { ProstoParserContext } from './model/parser-context'

type MapRule<CustData> = '' | 'content.join' | 'customData' | ((ctx: ProstoParserNodeContext<CustData>) => unknown)
type MapRuleTyped<CustData, ChildData> = keyof ChildData extends string ? MapRule<CustData> | `customData.${ keyof ChildData }` : MapRule<CustData>

export interface TProstoParserHoistOptions<CustData extends TGenericCustomDataType = TDefaultCustomDataType, ChildData extends TGenericCustomDataType = TDefaultCustomDataType> {
    node: ProstoParserNode<ChildData>
    as: keyof CustData
    onConflict?: 'error' | 'overwrite' | 'ignore'
    mapRule?: MapRuleTyped<CustData, ChildData>
    asArray?: boolean
    deep?: number | boolean
    removeChildFromContent?: boolean
}

export type TAbsorbRules<ChildData> = keyof ChildData extends string ? 'append' | 'join' | `copy->${ keyof ChildData }` | `join->${ keyof ChildData }` : 'append' | 'join'

export interface TProstoParserAbsorbOptions<T> {
    [nodeId: number]: TAbsorbRules<T>
}

export type TMapContentRules = 'first' | 'last' | 'join' | 'join-clear' | 'shift' | 'pop'
export type TMapContentRule<T> = ((content: ProstoParserNodeContext<T>['content']) => unknown) | TMapContentRules

export type TMapContentOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> = {
    [key in keyof T]: TMapContentRule<T>
}

export interface TProstoParserNodeOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor<T>
    endsWith?: TProstoParserTokenDescripor<T>
    popsAfterNode?: ProstoParserNode[]
    popsAtEOFSource?: boolean
    absorbs?: TProstoParserAbsorbOptions<T>
    badToken?: string | string[] | RegExp,
    skipToken?: string | string[] | RegExp,
    recognizes?: ProstoParserNode[]
    hoistChildren?: TProstoParserHoistOptions<T>[]
    mapContent?: TMapContentOptions<T>,
    onPop?: ((data: TPorstoParserCallbackData<T>) => void)
    onMatch?: ((data: TPorstoParserCallbackDataMatched<T>) => void)
    onAppendContent?: ((s: string, data: TPorstoParserCallbackData<T>) => string)
    onBeforeChildParse?: ((childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void)
    onAfterChildParse?: ((childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void)
    initCustomData?: () => T
}

export interface TProstoParserTokenDescripor<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    token: string | string[] | RegExp | ((context: ProstoParserNodeContext<T>) => string | string[] | RegExp)
    ignoreBackSlashed?: boolean
    omit?: boolean
    eject?: boolean
    onMatchToken?: (data: TPorstoParserCallbackDataMatched<T>) => boolean | { omit?: boolean, eject: boolean } | void
}

export interface TPorstoParserCallbackDataMatched<T extends TGenericCustomDataType = TDefaultCustomDataType> extends TPorstoParserCallbackData<T> {
    matched: RegExpExecArray | [string]
}

export interface TPorstoParserCallbackData<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    parserContext: ProstoParserContext
    context: ProstoParserNodeContext<T>
    customData: T
}

export interface TParseMatchResult {
    rg: RegExpMatchArray | [string]
    matched: boolean
    omit?: boolean
    eject?: boolean
}

export interface TSearchToken {
    y: RegExp, // w/flag y
    g: RegExp, // w/flag g
    rg: RegExp,
    node?: ProstoParserNode
}

export interface TGenericCustomDataType {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TDefaultCustomDataType = any // this can really be any, can't it?
