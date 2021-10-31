import { TParseMatchResult, TPorstoParseNodeMergeOptions, TPorstoParserCallbackData, TProstoParseNode, TProstoParserHoistOptions, TProstoParserTokenDescripor } from '.'
import { ProstoParseNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

let idCounter = 10000

export class ProstoParseNode<T = Record<string, unknown>> {
    public readonly id: number
    
    public recognizes: number[]

    public popsAfter: number[]
    
    public mergeWith: TPorstoParseNodeMergeOptions[]

    public hoistChildren: TProstoParserHoistOptions[]

    constructor(public readonly options: TProstoParseNode<T>) {
        this.id = options.id || idCounter++
        this.recognizes = options.recognizes?.map(item => typeof item === 'object' ? item.id : item) || []
        this.popsAfter = [options.popsAfterNode || []].flat().map(item => typeof item === 'object' ? item.id : item)
        this.mergeWith = options.mergeWith || []
        this.hoistChildren = options.hoistChildren || []
    }

    public createContext(index: number, level: number, rootContext?: ProstoParserRootContext): ProstoParseNodeContext {
        return new ProstoParseNodeContext(this as unknown as ProstoParseNode, index, level, rootContext)
    }

    public get name() {
        return this.constructor.name + '[' + this.id.toString() + ']' + '(' + (this.options.label || this.options.icon || '') + ')'
    }

    public addRecognizableNode(...args: (number | ProstoParseNode )[]) {
        this.recognizes.push(...(args.map(item => typeof item === 'object' ? item.id : item)))
        const unique: Record<string, boolean> = {}
        this.recognizes.filter(item => {
            if (!unique[item]) {
                unique[item] = true
                return true
            }
            return false
        })
    }

    public addPopAfterNode(...args: (number | ProstoParseNode )[]) {
        this.popsAfter.push(...(args.map(item => typeof item === 'object' ? item.id : item)))
        const unique: Record<string, boolean> = {}
        this.recognizes.filter(item => {
            if (!unique[item]) {
                unique[item] = true
                return true
            }
            return false
        })
    }

    public addMergeWith(...args: TPorstoParseNodeMergeOptions[]) {
        this.mergeWith.push(...args)
    }

    public addHoistChildren(...args: TProstoParserHoistOptions[]) {
        this.hoistChildren.push(...args)
    }

    startMatches(behind: string, here: string, cbData: TPorstoParserCallbackData): TParseMatchResult {
        return this.matches(behind, here, this.options.startsWith, cbData)
    }

    endMatches(behind: string, here: string, cbData: TPorstoParserCallbackData): TParseMatchResult {
        return this.matches(behind, here, this.options.endsWith, cbData)
    }

    skipMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.skipToken) {
            return lookFor(behind, here, {
                token: this.options.skipToken,
            }) || undefined
        }
    }

    goodMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.goodToken) {
            return lookFor(behind, here, {
                token: this.options.goodToken,
            }) || undefined
        }
        return [here]
    }

    badMatches(behind: string, here: string): RegExpMatchArray | undefined {
        if (this.options.badToken) {
            return lookFor(behind, here, {
                token: this.options.badToken,
            }) || undefined
        }
    }

    protected matches(behind: string, here: string, descr: TProstoParserTokenDescripor | undefined, cbData: TPorstoParserCallbackData): TParseMatchResult {
        if (descr) {
            const rg = lookFor(behind, here, descr) || undefined
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

function lookFor(behind: string, here: string, tokenDescriptor: TProstoParserTokenDescripor): RegExpMatchArray | undefined {
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
