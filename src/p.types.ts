import { ProstoParseNode } from './node'
import { ProstoParseNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

export interface TProstoParserHoistOptions {
    node: number | ProstoParseNode,
    as: string,
    asArray?: boolean,
    deep?: number | boolean
    removeFromContent?: boolean
    map?: (ctx: ProstoParseNodeContext) => unknown
}

export interface TProstoParseNode<T = any> {
    id?: number
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor<T>
    endsWith?: TProstoParserTokenDescripor<T>
    popsAfterNode?: number | ProstoParseNode | (number | ProstoParseNode)[]
    popsAtEOFSource?: boolean
    mergeWith?: TPorstoParseNodeMergeOptions[]
    goodToken?: string | string[] | RegExp,
    badToken?: string | string[] | RegExp,
    skipToken?: string | string[] | RegExp,
    recognizes?: (number | ProstoParseNode )[]
    hoistChildren?: TProstoParserHoistOptions[]
    mapContent?: { [key: string]: (content: ProstoParseNodeContext['content']) => unknown }
    // constraits?: TProstoParserNodeConstraits
    onPop?: (data: TPorstoParserCallbackData<T>) => void
    onMatch?: (data: TPorstoParserCallbackDataMatched<T>) => void
    onAppendContent?: (s: string | ProstoParseNodeContext['content'], data: TPorstoParserCallbackData<T>) => string | ProstoParseNodeContext['content']
}

export interface TPorstoParseNodeMergeOptions {
    parent: ProstoParseNode | number | (number | ProstoParseNode)[] | '*'
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
    context: ProstoParseNodeContext
    customData: T
}

export interface TProstoParserNodeConstraits {

}

export interface TProstoParserOptions {
    nodes: ProstoParseNode<any>[]
    rootNode: ProstoParseNode<any>
}

export interface TParseMatchResult {
    rg: RegExpMatchArray | [string]
    matched: boolean
    omit?: boolean
    eject?: boolean
}
