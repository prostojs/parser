import { TDefaultCustomDataType, TGenericCustomDataType } from '..'
import { TParseMatchResult, TPorstoParseNodeMergeOptions, TPorstoParserCallbackData,
    TProstoParserNodeOptions, TProstoParserHoistOptions, TProstoParserTokenDescripor } from '../p.types'
import { ProstoParserNode } from './node'

export abstract class ProstoParserNodeBase<T extends TGenericCustomDataType = TDefaultCustomDataType> {
    protected abstract readonly options: TProstoParserNodeOptions<T>
    
    public addRecognizableNode(...args: ProstoParserNode[]) {
        for (const node of args) {
            if (!this.options.recognizes) this.options.recognizes = []
            if (!this.options.recognizes.includes(node)) {
                this.options.recognizes.push(node)
            }
        }
    }

    public clearRecognizable() {
        this.options.recognizes = []
    }

    public addPopAfterNode(...args: ProstoParserNode[]) {
        for (const node of args) {
            if (!this.options.popsAfterNode) this.options.popsAfterNode = []
            if (!this.options.popsAfterNode.includes(node)) {
                this.options.popsAfterNode.push(node)
            }
        }
    }

    public clearPopAfter() {
        this.options.popsAfterNode = []
    }

    public addMergeWith(...args: TPorstoParseNodeMergeOptions[]) {
        if (!this.options.mergeWith) this.options.mergeWith = []
        this.options.mergeWith.push(...args)
    }

    public clearMergeWith() {
        this.options.mergeWith = []
    }

    public addHoistChildren(...args: TProstoParserHoistOptions<T>[]) {
        if (!this.options.hoistChildren) this.options.hoistChildren = []
        this.options.hoistChildren.push(...args)
    }

    public clearHoistChildren() {
        this.options.hoistChildren = []
    }
    
    startMatches(behind: string, here: string, cbData: TPorstoParserCallbackData<T>): TParseMatchResult {
        return this.matches(behind, here, this.options.startsWith, cbData)
    }

    endMatches(behind: string, here: string, cbData: TPorstoParserCallbackData<T>): TParseMatchResult {
        return this.matches(behind, here, this.options.endsWith, cbData)
    }

    skipMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.skipToken) {
            return this.lookFor(behind, here, {
                token: this.options.skipToken,
            }) || undefined
        }
    }

    goodMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.goodToken) {
            return this.lookFor(behind, here, {
                token: this.options.goodToken,
            }) || undefined
        }
        return [here]
    }

    badMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.badToken) {
            return this.lookFor(behind, here, {
                token: this.options.badToken,
            }) || undefined
        }
    }

    private lookFor(behind: string, here: string, tokenDescriptor: TProstoParserTokenDescripor<T>): RegExpMatchArray | undefined {
        const { token, negativeLookBehind, negativeLookAhead } = tokenDescriptor
        if ((!negativeLookBehind || !behind.match(negativeLookBehind)) && (!negativeLookAhead || !here.slice(1).match(negativeLookAhead))) {
            if (typeof token === 'string' || Array.isArray(token)) {
                const arrayOfTokens = (typeof token === 'string' ? [token] : token)
                for (let j = 0; j < arrayOfTokens.length; j++) {
                    const startsWithToken = arrayOfTokens[j]
                    if (here.startsWith(startsWithToken)) {
                        return [startsWithToken]
                    }
                }
            } else if (token) {
                const match = here.match(token)
                if (match) {
                    return match
                }
            }
        }
    }
    
    protected matches(behind: string, here: string, descr: TProstoParserTokenDescripor<T> | undefined, cbData: TPorstoParserCallbackData<T>): TParseMatchResult {
        if (descr) {
            const rg = this.lookFor(behind, here, descr) || undefined
            if (rg) {
                const { omit, eject, onMatchToken } = descr
                let cbResult: boolean | { omit?: boolean, eject: boolean } | void = true
                if (onMatchToken) {
                    cbResult = onMatchToken({
                        ...cbData,
                        matched: rg,
                    })
                }
                const cbOmit = typeof cbResult === 'object' ? cbResult.omit : undefined
                const cbEject = typeof cbResult === 'object' ? cbResult.eject : undefined
                return {
                    rg,
                    matched: cbResult !== false,
                    omit: cbOmit !== undefined ? cbOmit : omit,
                    eject: cbEject !== undefined ? cbEject : eject,
                }
            }
            return {
                rg: [''],
                matched: false,
            }
        }
        return {
            rg: [''],
            matched: false,
        }
    }
}
