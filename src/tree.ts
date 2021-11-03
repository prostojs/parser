import { ProstoTree } from '@prostojs/tree'
import { ProstoParserNodeContext } from './model/node-context'

const styles = {
    banner: (s: string) => __DYE_RED__ + s + __DYE_COLOR_OFF__,
    text: (s: string) => __DYE_GREEN__ + s + __DYE_COLOR_OFF__,
    valuesDim: (s: string) => __DYE_CYAN__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    boolean: (s: string) => __DYE_BLUE_BRIGHT__ + s + __DYE_COLOR_OFF__,
    booleanDim: (s: string) => __DYE_BLUE_BRIGHT__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    underscore: (s: string) => __DYE_UNDERSCORE__ + s + __DYE_UNDERSCORE_OFF__,
    values: (s: string | number) => (typeof s === 'string' ? __DYE_CYAN_BRIGHT__ : __DYE_YELLOW_BRIGHT__) + s.toString() + __DYE_COLOR_OFF__,
    nodeDim: (s: string) => __DYE_YELLOW__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    node: (s: string) => __DYE_YELLOW__ + s + __DYE_COLOR_OFF__,
}

const stringOutputLimit = 70

export const parserTree: ProstoTree<ProstoParserNodeContext | string | 0> = new ProstoTree<ProstoParserNodeContext | string | 0>({
    children: 'content',
    renderLabel: (context) => {
        if (typeof context === 'string') {
            let s = context.replace(/\n/g, '\\n')
            if (s.length > stringOutputLimit) {
                s = s.slice(0, stringOutputLimit) + __DYE_YELLOW__ + '…' + __DYE_GREEN__
            }
            return styles.text('«' + s + '»')
        } else if (typeof context === 'object' && context instanceof ProstoParserNodeContext) {
            let keys = ''
            const data = context.getCustomData<Record<string, unknown>>()
            Object.keys(data).forEach(key => {
                const val = data[key]
                if (typeof val === 'string' || typeof val === 'number') {
                    keys += ' ' + styles.valuesDim(key + '(') + styles.values(val) + styles.valuesDim(')')
                } else if (Array.isArray(val)) {
                    keys += ' ' + styles.valuesDim(key + `[${ val.length }]`)
                } else if (typeof val === 'object') {
                    keys += ' ' + styles.valuesDim(`{ ${ key } }`)
                } else if (typeof val === 'boolean' && val) {
                    const st = key ? styles.boolean : styles.booleanDim
                    keys += ' ' + `${ styles.underscore(st(key)) }${ st(val ? '☑' : '☐') }`
                }
            })
            return styles.node(context.icon + (context.label ? ' ' : '')) + styles.nodeDim(context.label) + keys
        }
        return ''
    },
})
