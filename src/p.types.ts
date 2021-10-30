export type TGenericNodeIdType = string | number

export interface TProstoParserHoistOptions<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    id: IdType,
    as: string,
    asArray?: boolean,
    deep?: number | boolean
    removeFromContent?: boolean
    map?: (ctx: TProstoParserContext<IdType>) => unknown
}

export interface TProstoParseNode<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    id: IdType
    label?: string
    icon?: string
    startsWith?: TProstoParserTokenDescripor<IdType>
    endsWith?: TProstoParserTokenDescripor<IdType>
    popsAfterNode?: IdType | IdType[]
    popsAtEOFSource?: boolean
    mergeWith?: TPorstoParseNodeMergeOptions<IdType>[]
    skipToken?: string | string[] | RegExp,
    recognizes: IdType[]
    hoistChildren?: TProstoParserHoistOptions<IdType>[]
    mapContent?: { [key: string]: (content: TProstoParserContext<IdType>['_content']) => unknown }
    constraits?: TProstoParserNodeConstraits
    onPop?: (data: TPorstoParserCallbackData<IdType>) => void
    onMatch?: (data: TPorstoParserCallbackData<IdType>) => void
    onAppendContent?: (s: string | TProstoParserContext['_content'], data: TPorstoParserCallbackData<IdType>) => string | TProstoParserContext['_content']
}

export interface TPorstoParseNodeMergeOptions<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    parent: IdType | IdType[] | '*'
    join?: boolean
}

export interface TProstoParserTokenDescripor<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    token: string | string[] | RegExp
    omit?: boolean | ((data: TPorstoParserCallbackData<IdType>) => boolean)
    eject?: boolean | ((data: TPorstoParserCallbackData<IdType>) => boolean)
    negativeLookBehind?: RegExp
    negativeLookAhead?: RegExp
    onMatchToken?: (data: TPorstoParserCallbackData<IdType>) => boolean
}

export interface TPorstoParserCallbackData<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    context: TProstoParserContext<IdType>
    matched?: RegExpMatchArray,
    stack: TProstoParserContext<IdType>[]
    parent?: TProstoParseNode<IdType>
    pos: number
    src: string
    behind: string
    here: string
    error: (s: string) => void
    jump: (n?: number) => number
    appendContent: (s: string | TProstoParserContext['_content'], ctx?: TProstoParserContext<IdType>) => void
    pop: () => void
    push: (newContext: TProstoParserContext<IdType>) => void
}

export interface TProstoParserContext<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    _index: number
    _level: number
    _nodeId: IdType
    _label: string
    _icon?: string
    _content: (string | TProstoParserContext | 0)[]
    toTree: (colored?: boolean) => string
    [key: string]: IdType | (string | TProstoParserContext | 0)[] | string | number | TProstoParserContext<IdType> | unknown
}

export interface TProstoParserNodeConstraits {

}

export interface TProstoParserOptions<IdType extends TGenericNodeIdType = TGenericNodeIdType> {
    nodes: TProstoParseNode<IdType>[]
    rootNode: IdType
}
