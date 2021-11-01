import { TParseMatchResult, TPorstoParseNodeMergeOptions, TPorstoParserCallbackData, TProstoParserNodeOptions, TProstoParserHoistOptions, TProstoParserTokenDescripor } from '.'
import { ProstoParserNodeBase } from './node-base'
import { ProstoParserNodeContext } from './node-context'
import { ProstoParserRootContext } from './root-context'

let idCounter = 0

export class ProstoParserNode<T = any> extends ProstoParserNodeBase<T> {   
    public readonly id: number
    
    public onMatch: Required<TProstoParserNodeOptions<T>>['onMatch']

    constructor(protected readonly options: TProstoParserNodeOptions<T>) {
        super()
        this.id = idCounter++

        this.onMatch = (d) => options.onMatch ? options.onMatch(d) : undefined
    }

    public getOptions(): TProstoParserNodeOptions<T> {
        return {
            label: this.options.label || '',
            icon: this.options.icon || '',
            startsWith: this.options.startsWith ? { ...this.options.startsWith } : undefined,
            endsWith: this.options.endsWith ? { ...this.options.endsWith } : undefined,
            popsAfterNode: [...(this.options.popsAfterNode || [])],
            popsAtEOFSource: this.options.popsAtEOFSource,
            mergeWith: [...(this.options.mergeWith || [])],
            goodToken: this.options.goodToken || '',
            badToken: this.options.badToken || '',
            skipToken: this.options.skipToken || '',
            recognizes: [...(this.options.recognizes || [])],
            hoistChildren: [...(this.options.hoistChildren || [])],
            mapContent: {
                ...this.options.mapContent,
            },
            onPop: this.options.onPop,
            onMatch: this.options.onMatch,
            onAppendContent: this.options.onAppendContent,
        }
    }

    public createContext(index: number, level: number, rootContext?: ProstoParserRootContext): ProstoParserNodeContext {
        return new ProstoParserNodeContext(this as unknown as ProstoParserNode, index, level, rootContext)
    }

    public get name() {
        return this.constructor.name + '[' + this.id.toString() + ']' + '(' + (this.options.label || this.options.icon || '') + ')'
    }
}
