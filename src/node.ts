import { TParseMatchResult, TPorstoParserCallbackData, TProstoParseNode, TProstoParserTokenDescripor } from '.'
import { ProstoParseNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

export class ProstoParseNode<ContextCustomType extends Record<string | number, unknown> = Record<string | number, unknown>> {
    public readonly id: number

    constructor(public readonly options: TProstoParseNode) {
        this.id = options.id
    }

    public createContext(index: number, level: number, rootContext?: ProstoParserRootContext): ProstoParseNodeContext<ContextCustomType> {
        return new ProstoParseNodeContext<ContextCustomType>(this, index, level, rootContext)
    }

    public get name() {
        return this.constructor.name + '[' + this.id.toString() + ']' + '(' + (this.options.label || '') + ')'
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

    protected matches(behind: string, here: string, descr: TProstoParserTokenDescripor | undefined, cbData: TPorstoParserCallbackData): TParseMatchResult {
        if (descr) {
            const rg = lookFor(behind, here, descr) || undefined
            if (rg) {
                const { omit, eject, onMatchToken } = descr
                let cbResult: boolean | { omit?: boolean, eject: boolean } | undefined = true
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
