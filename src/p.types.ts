import { ProstoParserNode } from './node'
import { ProstoParserNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

export interface TProstoParserHoistOptions<T = any> {
    node: ProstoParserNode,
    as: keyof T,
    asArray?: boolean,
    deep?: number | boolean
    removeFromContent?: boolean
    map?: (ctx: ProstoParserNodeContext) => unknown
}

export interface TProstoParserNodeOptions<T = any> {
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor<T>
    endsWith?: TProstoParserTokenDescripor<T>
    popsAfterNode?: ProstoParserNode[]
    popsAtEOFSource?: boolean
    mergeWith?: TPorstoParseNodeMergeOptions[]
    goodToken?: string | string[] | RegExp,
    badToken?: string | string[] | RegExp,
    skipToken?: string | string[] | RegExp,
    recognizes?: ProstoParserNode[]
    hoistChildren?: TProstoParserHoistOptions<T>[]
    mapContent?: { [key: string]: (content: ProstoParserNodeContext['content']) => unknown }
    onPop?: (data: TPorstoParserCallbackData<T>) => void
    onMatch?: (data: TPorstoParserCallbackDataMatched<T>) => void
    onAppendContent?: (s: string | ProstoParserNodeContext['content'], data: TPorstoParserCallbackData<T>) => string | ProstoParserNodeContext['content']
    onBeforeChildParse?: (childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void
    onAfterChildParse?: (childContext: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) => void
}

export interface TPorstoParseNodeMergeOptions {
    parent: ProstoParserNode | ProstoParserNode[] | '*'
    join?: boolean
}

export interface TProstoParserTokenDescripor<T = any> {
    token: string | string[] | RegExp
    omit?: boolean
    eject?: boolean
    negativeLookBehind?: RegExp
    negativeLookAhead?: RegExp
    onMatchToken?: (data: TPorstoParserCallbackDataMatched<T>) => boolean | { omit?: boolean, eject: boolean } | void
}

export interface TPorstoParserCallbackDataMatched<T = any> extends TPorstoParserCallbackData<T> {
    matched: RegExpMatchArray | [string]
}

export interface TPorstoParserCallbackData<T = any> {
    rootContext: ProstoParserRootContext
    context: ProstoParserNodeContext<T>
    customData: T
}

export interface TProstoParserNodeConstraits {

}

export interface TParseMatchResult {
    rg: RegExpMatchArray | [string]
    matched: boolean
    omit?: boolean
    eject?: boolean
}
