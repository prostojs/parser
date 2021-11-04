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
                        if (!Array.isArray(hoisted)) {
                            if (!options.onConflict || options.onConflict === 'error') {
                                throw new Error(`Can not hoist "${ ctx.node.name }" to "${ context.node.name }" as "${ options.as as string }". "${ options.as as string }" already exists and it is not an Array Type.`)
                            } else if (options.onConflict === 'overwrite') {
                                customData[options.as as string] = [doTheMapRule(options, ctx)]
                            } else if (options.onConflict !== 'ignore') {
                                throw new Error(`Unsupported hoisting option onConflict "${ options.onConflict as string }"`)
                            }
                        } else {
                            hoisted.push(doTheMapRule(options, ctx))
                        }
                    } else {
                        if (customData[options.as as string]) {
                            if (!options.onConflict || options.onConflict === 'error') {
                                throw new Error(`Can not hoist multiple "${ ctx.node.name }" to "${ context.node.name }" as "${ options.as as string }". "${ options.as as string }" already exists.`)
                            } else if (options.onConflict === 'overwrite') {
                                customData[options.as as string] = doTheMapRule(options, ctx)
                            } else if (options.onConflict !== 'ignore') {
                                throw new Error(`Unsupported hoisting option onConflict "${ options.onConflict as string }"`)
                            }
                        } else {
                            customData[options.as as string] = doTheMapRule(options, ctx)
                        }
                    }
                    if (options.removeChildFromContent) {
                        context.content = context.content.filter(c => c !== ctx) 
                    }
                }
            })
        }
        function doTheMapRule(options: TProstoParserHoistOptions, ctx: ProstoParserNodeContext) {
            if (typeof options.mapRule === 'function') {
                return options.mapRule(ctx)
            }
            if (options.mapRule === 'content.join') {
                return ctx.content.join('')
            }
            if (options.mapRule?.startsWith('customData')) {
                const key = options.mapRule.slice(11)
                if (key) {
                    return ctx.getCustomData<Record<string, unknown>>()[key]
                } else {
                    return ctx.getCustomData<Record<string, unknown>>()
                }
            }
            return ctx
        }
    }
}
