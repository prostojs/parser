import { TDefaultCustomDataType, TGenericCustomDataType, TMapContentOptions } from '..'
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

    public getOptions(): TProstoParserNodeOptions<T> {
        return {
            label: this.options.label || '',
            icon: this.options.icon || '',
            startsWith: (this.options.startsWith ? { ...this.options.startsWith } : this.options.startsWith) as Required<TProstoParserNodeOptions>['startsWith'],
            endsWith: (this.options.endsWith ? { ...this.options.endsWith } : this.options.endsWith) as Required<TProstoParserNodeOptions>['endsWith'],
            popsAfterNode: [...(this.options.popsAfterNode || [])],
            popsAtEOFSource: this.options.popsAtEOFSource || false,
            mergeWith: [...(this.options.mergeWith || [])],
            badToken: this.options.badToken || '',
            skipToken: this.options.skipToken || '',
            recognizes: [...(this.options.recognizes || [])],
            hoistChildren: [...(this.options.hoistChildren || [])],
            mapContent: {
                ...this.options.mapContent,
            } as TMapContentOptions<T>,
            onPop: this.options.onPop as Required<TProstoParserNodeOptions>['onPop'],
            onMatch: this.options.onMatch as Required<TProstoParserNodeOptions>['onMatch'],
            onAppendContent: this.options.onAppendContent as Required<TProstoParserNodeOptions>['onAppendContent'],
            onAfterChildParse: this.options.onAfterChildParse as Required<TProstoParserNodeOptions>['onAfterChildParse'],
            onBeforeChildParse: this.options.onBeforeChildParse as Required<TProstoParserNodeOptions>['onBeforeChildParse'],
            initCustomData: this.options.initCustomData as Required<TProstoParserNodeOptions>['initCustomData'],
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
}
