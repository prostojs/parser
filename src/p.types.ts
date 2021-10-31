import { ProstoParseNode } from './node'
import { ProstoParseNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

export interface TProstoParserHoistOptions {
    id: number,
    as: string,
    asArray?: boolean,
    deep?: number | boolean
    removeFromContent?: boolean
    map?: (ctx: ProstoParseNodeContext) => unknown
}

export interface TProstoParseNode {
    id: number
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor
    endsWith?: TProstoParserTokenDescripor
    popsAfterNode?: number | number[]
    popsAtEOFSource?: boolean
    mergeWith?: TPorstoParseNodeMergeOptions[]
    skipToken?: string | string[] | RegExp,
    recognizes: number[]
    hoistChildren?: TProstoParserHoistOptions[]
    mapContent?: { [key: string]: (content: ProstoParseNodeContext['content']) => unknown }
    constraits?: TProstoParserNodeConstraits
    onPop?: (data: TPorstoParserCallbackData) => void
    onMatch?: (data: TPorstoParserCallbackDataMatched) => void
    onAppendContent?: (s: string | ProstoParseNodeContext['content'], data: TPorstoParserCallbackData) => string | ProstoParseNodeContext['content']
}

export interface TPorstoParseNodeMergeOptions {
    parent: number | number[] | '*'
    join?: boolean
}

export interface TProstoParserTokenDescripor {
    token: string | string[] | RegExp
    omit?: boolean
    eject?: boolean
    negativeLookBehind?: RegExp
    negativeLookAhead?: RegExp
    onMatchToken?: (data: TPorstoParserCallbackDataMatched) => boolean | { omit?: boolean, eject: boolean } | undefined
}

export interface TPorstoParserCallbackDataMatched extends TPorstoParserCallbackData {
    matched: RegExpMatchArray | [string]
}

export interface TPorstoParserCallbackData {
    rootContext: ProstoParserRootContext,
    context: ProstoParseNodeContext,
}

export interface TProstoParserNodeConstraits {

}

export interface TProstoParserOptions {
    nodes: ProstoParseNode[]
    rootNode: ProstoParseNode
}

export interface TParseMatchResult {
    rg: RegExpMatchArray | [string]
    matched: boolean
    omit?: boolean
    eject?: boolean
}
