import { TDefaultCustomDataType, TGenericCustomDataType, TMapContentOptions, TPorstoParserCallbackData, TPorstoParserCallbackDataMatched } from '..'
import { TProstoParserNodeOptions } from '../p.types'
import { ProstoParserNodeBase } from './node-base'
import { ProstoParserNodeContext } from './node-context'
import { ProstoParserContext } from './parser-context'

let idCounter = 0

export class ProstoParserNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends ProstoParserNodeBase<T> {   
    public readonly id: number

    constructor(protected readonly options: TProstoParserNodeOptions<T>) {
        super()
        this.id = idCounter++
    }

    public getOptions(): Required<TProstoParserNodeOptions<T>> {
        return {
            label: this.options.label || '',
            icon: this.options.icon || '',
            startsWith: (this.options.startsWith ? { ...this.options.startsWith } : this.options.startsWith) as Required<TProstoParserNodeOptions<T>>['startsWith'],
            endsWith: (this.options.endsWith ? { ...this.options.endsWith } : this.options.endsWith) as Required<TProstoParserNodeOptions<T>>['endsWith'],
            popsAfterNode: [...(this.options.popsAfterNode || [])],
            popsAtEOFSource: this.options.popsAtEOFSource || false,
            badToken: this.options.badToken || '',
            skipToken: this.options.skipToken || '',
            recognizes: [...(this.options.recognizes || [])],
            hoistChildren: [...(this.options.hoistChildren || [])],
            mapContent: {
                ...this.options.mapContent,
            } as TMapContentOptions<T>,
            onPop: this.options.onPop as Required<TProstoParserNodeOptions<T>>['onPop'],
            onMatch: this.options.onMatch as Required<TProstoParserNodeOptions<T>>['onMatch'],
            onAppendContent: this.options.onAppendContent as Required<TProstoParserNodeOptions<T>>['onAppendContent'],
            onAfterChildParse: this.options.onAfterChildParse as Required<TProstoParserNodeOptions<T>>['onAfterChildParse'],
            onBeforeChildParse: this.options.onBeforeChildParse as Required<TProstoParserNodeOptions<T>>['onBeforeChildParse'],
            initCustomData: this.options.initCustomData as Required<TProstoParserNodeOptions<T>>['initCustomData'],
            absorbs: this.options.absorbs as Required<TProstoParserNodeOptions<T>>['absorbs'],
        }
    }

    public createContext(index: number, level: number, rootContext?: ProstoParserContext): ProstoParserNodeContext<T> {
        return new ProstoParserNodeContext(this, index, level, rootContext)
    }

    public get name() {
        return this.constructor.name + '[' + this.id.toString() + ']' + '(' + (this.options.label || this.options.icon || '') + ')'
    }
    
    public parse(source: string) {
        return this.createContext(0, 0).parserContext.parse(source)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public beforeOnPop(data: TPorstoParserCallbackData<T>) {
        // to be overriden
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public beforeOnMatch(data: TPorstoParserCallbackDataMatched<T>) {
        // to be overriden
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public beforeOnAppendContent(s: string, data: TPorstoParserCallbackData<T>): string {
        // to be overriden
        return s
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public beforeOnAfterChildParse(child: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) {
        // to be overriden
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public beforeOnBeforeChildParse(child: ProstoParserNodeContext, data: TPorstoParserCallbackData<T>) {
        // to be overriden
    }
}
