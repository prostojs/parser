import { TProstoParserHoistOptions } from '.'
import { ProstoParseNodeContext } from './node-context'

interface HoistItems { [contextIndex: number]: {options: TProstoParserHoistOptions, context: ProstoParseNodeContext} }

export class ProstoHoistManager {
    data: Record<number, HoistItems> = {}

    addHoistOptions(ctx: ProstoParseNodeContext) {
        const targetNode = ctx.node
        if (targetNode.hoistChildren) {
            targetNode.hoistChildren.forEach(options => {
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

    removeHoistOptions(ctx: ProstoParseNodeContext) {
        const targetNode = ctx.node
        if (targetNode.hoistChildren) {
            targetNode.hoistChildren.forEach(options => {
                const nodeId = typeof options.node === 'object' ? options.node.id : options.node
                const hoist = this.data[nodeId]
                if (hoist) {
                    delete hoist[ctx.index]
                }
            })
        }
    }

    processHoistOptions(ctx: ProstoParseNodeContext) {
        const id = ctx.node.id
        const hoist = this.data[id]
        if (hoist) {
            Object.keys(hoist).map(i => hoist[i as unknown as number]).forEach(({ options, context }) => {
                if (options.deep === true || Number(options.deep) >= (ctx.level - context.level)) {
                    if (options.asArray) {
                        const hoisted = context.customContent[options.as] = (context.customContent[options.as] || []) as unknown[]
                        hoisted.push(options.map ? options.map(ctx) : ctx)
                    } else {
                        if (context.customContent[options.as]) {
                            throw new Error(`Can not hoist multiple "${ ctx.node.name }" to "${ context.node.name }" as "${ options.as }". "${ options.as }" already exists.`)
                        } else {
                            context.customContent[options.as] = options.map ? options.map(ctx) : ctx
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
