import { TDefaultCustomDataType, TGenericCustomDataType } from '..'
import { TPorstoParseNodeMergeOptions, TPorstoParserCallbackData,
    TProstoParserNodeOptions, TProstoParserHoistOptions, TProstoParserTokenDescripor } from '../p.types'
import { escapeRegex } from '../utils'
import { ProstoParserNode } from './node'

export abstract class ProstoParserNodeBase<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    protected abstract options: TProstoParserNodeOptions<T>

    //
    // Add Helpers  =======================================================================================
    //

    public addRecognizes(...args: ProstoParserNode[]) {
        for (const node of args) {
            if (!this.options.recognizes) this.options.recognizes = []
            if (!this.options.recognizes.includes(node)) {
                this.options.recognizes.push(node)
            }
        }
    }

    public addPopsAfterNode(...args: ProstoParserNode[]) {
        for (const node of args) {
            if (!this.options.popsAfterNode) this.options.popsAfterNode = []
            if (!this.options.popsAfterNode.includes(node)) {
                this.options.popsAfterNode.push(node)
            }
        }
    }

    public addMergeWith(...args: TPorstoParseNodeMergeOptions[]) {
        if (!this.options.mergeWith) this.options.mergeWith = []
        this.options.mergeWith.push(...args)
    }

    public addHoistChildren(...args: TProstoParserHoistOptions<T>[]) {
        if (!this.options.hoistChildren) this.options.hoistChildren = []
        this.options.hoistChildren.push(...args)
    }

    //
    // Options Setters/Getters  =======================================================================================
    //

    public get startsWith() {
        return this.options.startsWith
    }

    public set startsWith(value: TProstoParserNodeOptions['startsWith'] | undefined) {
        this.options.startsWith = value
    }

    public get endsWith() {
        return this.options.endsWith
    }

    public set endsWith(value: TProstoParserNodeOptions['endsWith'] | undefined) {
        this.options.endsWith = value
    }

    public get popsAtEOFSource() {
        return this.options.popsAtEOFSource
    }

    public set popsAtEOFSource(value: TProstoParserNodeOptions['popsAtEOFSource'] | undefined) {
        this.options.popsAtEOFSource = value
    }

    public get mergeWith() {
        return this.options.mergeWith || []
    }

    public set mergeWith(value: TProstoParserNodeOptions['mergeWith'] | undefined) {
        this.options.mergeWith = value
    }

    public get badToken() {
        return this.options.badToken
    }

    public set badToken(value: TProstoParserNodeOptions['badToken'] | undefined) {
        this.options.badToken = value
    }

    public get skipToken() {
        return this.options.skipToken
    }

    public set skipToken(value: TProstoParserNodeOptions['skipToken'] | undefined) {
        this.options.skipToken = value
    }

    public get recognizes(): ProstoParserNode[] {
        return this.options.recognizes || []
    }

    public set recognizes(value: TProstoParserNodeOptions['recognizes'] | undefined) {
        this.options.recognizes = value
    }

    public get hoistChildren() {
        return this.options.hoistChildren || []
    }

    public set hoistChildren(value: TProstoParserNodeOptions['hoistChildren'] | undefined) {
        this.options.hoistChildren = value
    }

    public get mapContent() {
        return this.options.mapContent
    }

    public set mapContent(value: TProstoParserNodeOptions['mapContent'] | undefined) {
        this.options.mapContent = value
    }

    public get popsAfterNode() {
        return this.options.popsAfterNode || []
    }
    
    public set popsAfterNode(nodes: ProstoParserNode[]) {
        this.options.popsAfterNode = nodes
    }

    //
    // Clean Helpers  =======================================================================================
    //

    public clearStartsWith() {
        delete this.options.startsWith
    }
    
    public clearEndsWith() {
        delete this.options.endsWith
    }
    
    public clearPopsAtEOFSource() {
        delete this.options.popsAtEOFSource
    }
    
    public clearMergeWith() {
        delete this.options.mergeWith
    }
    
    public clearBadToken() {
        delete this.options.badToken
    }
    
    public clearSkipToken() {
        delete this.options.skipToken
    }
    
    public clearRecognizes() {
        delete this.options.recognizes
    }
    
    public clearHoistChildren() {
        delete this.options.hoistChildren
    }
    
    public clearMapContent() {
        delete this.options.mapContent
    }
    
    public removeOnPop() {
        delete this.options.onPop
    }
    
    public removeOnMatch() {
        delete this.options.onMatch
    }
    
    public removeOnAppendContent() {
        delete this.options.onAppendContent
    }
    
    public removeOnBeforeChildParse() {
        delete this.options.onBeforeChildParse
    }
    
    public removeOnAfterChildParse() {
        delete this.options.onAfterChildParse
    }

    //
    // Fire Hooks Callbacks  =======================================================================================
    //

    public fireNodeMatched(matched: RegExpExecArray, cbData: TPorstoParserCallbackData<T>): { omit?: boolean, eject?: boolean, confirmed: boolean } {
        return this.options.startsWith ? this.fireMatched(this.options.startsWith, matched, cbData) : { confirmed: true }
    }

    public fireNodeEndMatched(matched: RegExpExecArray, cbData: TPorstoParserCallbackData<T>): { omit?: boolean, eject?: boolean, confirmed: boolean } {
        return this.options.endsWith ? this.fireMatched(this.options.endsWith, matched, cbData) : { confirmed: true }
    }

    private fireMatched(descr: TProstoParserTokenDescripor<T>, matched: RegExpExecArray, cbData: TPorstoParserCallbackData<T>) {
        const { omit, eject, onMatchToken } = descr
        let cbResult: boolean | { omit?: boolean, eject: boolean } | void = true
        if (onMatchToken) {
            cbResult = onMatchToken({
                ...cbData,
                matched,
            })
        }
        const cbOmit = typeof cbResult === 'object' ? cbResult.omit : undefined
        const cbEject = typeof cbResult === 'object' ? cbResult.eject : undefined
        return {
            omit: cbOmit !== undefined ? cbOmit : omit,
            eject: cbEject !== undefined ? cbEject : eject,
            confirmed: cbResult !== false,
        }
    }

    //
    // Tokens Helpers  =======================================================================================
    //

    public getStartTokenRg(): RegExp | void {
        return this.getRgOutOfTokenDescriptor(this.options.startsWith)
    }

    public getEndTokenRg(): RegExp | void {
        return this.getRgOutOfTokenDescriptor(this.options.endsWith)
    }

    public getConstraintTokens(): { skip?: RegExp, bad?: RegExp } {
        return {
            skip: this.getRgOutOfTokenDescriptor(this.options.skipToken ? { token: this.options.skipToken } : undefined) || undefined,
            bad: this.getRgOutOfTokenDescriptor(this.options.badToken ? { token: this.options.badToken } : undefined) || undefined,
        }
    }

    private getRgOutOfTokenDescriptor(descr: TProstoParserTokenDescripor<T> | undefined): RegExp | void {
        if (descr) {
            const prefix = descr.ignoreBackSlashed ? /(?<=[^\\](?:\\\\)*)/.source : ''
            let token: string | string[] | RegExp
            if (typeof descr.token === 'function') {
                token = descr.token(this)
            } else {
                token = descr.token
            }
            if (token instanceof RegExp) {
                return new RegExp(prefix + token.source, token.flags)
            } else {
                return new RegExp(`${ prefix }(?:${ [token].flat().map(t => escapeRegex(t)).join('|') })`)
            }
        }
    }
}
