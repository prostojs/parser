import { TProstoParserHoistOptions } from '../p.types'
import { ProstoParserNodeContext } from './node-context'

interface HoistItems { [contextIndex: number]: {options: TProstoParserHoistOptions, context: ProstoParserNodeContext} }

export class ProstoHoistManager {
    data: Record<number, HoistItems> = {}

    addHoistOptions(ctx: ProstoParserNodeContext) {
        if (ctx.hoistChildren) {
            ctx.hoistChildren.forEach(options => {
                const nodeId = typeof options.node === 'object' ? options.node.id : options.node
                const hoist = this.data[nodeId] = (this.data[nodeId] || {})
                if (hoist) {
                    hoist[ctx.index] = {
                        options,
                        context: ctx,
                    }
                }
            })
        }
    }

    removeHoistOptions(ctx: ProstoParserNodeContext) {
        if (ctx.hoistChildren) {
            ctx.hoistChildren.forEach(options => {
                const nodeId = typeof options.node === 'object' ? options.node.id : options.node
                const hoist = this.data[nodeId]
                if (hoist) {
                    delete hoist[ctx.index]
                }
            })
        }
    }

    processHoistOptions(ctx: ProstoParserNodeContext) {
        const id = ctx.node.id
        const hoist = this.data[id]
        if (hoist) {
            Object.keys(hoist).map(i => hoist[i as unknown as number]).forEach(({ options, context }) => {
                const customData = context.getCustomData<Record<string, unknown>>()
                if (options.deep === true || Number(options.deep) >= (ctx.level - context.level)) {
                    if (options.asArray) {
                        const hoisted = customData[options.as as string] = (customData[options.as as string] || []) as unknown[]
                        hoisted.push(options.map ? options.map(ctx) : ctx)
                    } else {
                        if (customData[options.as as string]) {
                            throw new Error(`Can not hoist multiple "${ ctx.node.name }" to "${ context.node.name }" as "${ options.as as string }". "${ options.as as string }" already exists.`)
                        } else {
                            customData[options.as as string] = options.map ? options.map(ctx) : ctx
                        }
                    }
                    if (options.removeFromContent) {
                        context.content = context.content.filter(c => c !== ctx) 
                    }
                }
            })
        }
    }
}
