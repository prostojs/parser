import { ProstoParserNode } from './model/node'
import { ProstoParserNodeContext } from './model/node-context'
import { ProstoParserContext } from './model/parser-context'

export interface TProstoParserHoistOptions<T extends TGenericCustomDataType = TDefaultCustomDataType, T2 extends TGenericCustomDataType = TDefaultCustomDataType> {
    node: ProstoParserNode<T2>
    as: keyof T
    onConflict?: 'error' | 'overwrite' | 'ignore'
    mapRule?: keyof T2 extends string ? '' | 'content.join' | `customData.${ keyof T2 }` : '' | 'content.join'
    asArray?: boolean
    deep?: number | boolean
    removeChildFromContent?: boolean
    map?: (ctx: ProstoParserNodeContext<T>) => unknown
}

export type TMapContentOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> = {
    [key in keyof T]: (content: ProstoParserNodeContext<T>['content']) => unknown
}

export interface TProstoParserNodeOptions<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor<T>
    endsWith?: TProstoParserTokenDescripor<T>
    popsAfterNode?: ProstoParserNode[]
    popsAtEOFSource?: boolean
    mergeWith?: TPorstoParseNodeMergeOptions[]
    badToken?: string | string[] | RegExp,
    skipToken?: string | string[] | RegExp,
    recognizes?: ProstoParserNode[]
    hoistChildren?: TProstoParserHoistOptions<T>[]
    mapContent?: TMapContentOptions<T>,
    onPop?: ((data: TPorstoParserCallbackData<T>) => void)
    onMatch?: ((data: TPorstoParserCallbackDataMatched<T>) => void)
    onAppendContent?: ((s: string | ProstoParserNodeContext<T>['content'], data: TPorstoParserCallbackData<T>) => string | ProstoParserNodeContext<T>['content'])
    onBeforeChildParse?: ((childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void)
    onAfterChildParse?: ((childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void)
    initCustomData?: () => T
}

export interface TPorstoParseNodeMergeOptions {
    parent: ProstoParserNode | ProstoParserNode[] | '*'
    join?: boolean
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
