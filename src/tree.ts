import { ProstoTree } from '@prostojs/tree'
import { ProstoParseNodeContext } from './node-context'

const styles = {
    banner: (s: string) => __DYE_RED__ + s + __DYE_COLOR_OFF__,
    text: (s: string) => __DYE_GREEN__ + s + __DYE_COLOR_OFF__,
    valuesDim: (s: string) => __DYE_CYAN__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    values: (s: string) => __DYE_CYAN_BRIGHT__ + s + __DYE_COLOR_OFF__,
    nodeDim: (s: string) => __DYE_YELLOW__ + __DYE_DIM__ + s + __DYE_COLOR_OFF__ + __DYE_DIM_OFF__,
    node: (s: string) => __DYE_YELLOW__ + s + __DYE_COLOR_OFF__,
}

export const parserTree: ProstoTree<ProstoParseNodeContext | string | 0> = new ProstoTree<ProstoParseNodeContext | string | 0>({
    children: 'content',
    renderLabel: (context) => {
        if (typeof context === 'string') {
            return styles.text('«' + context.replace(/\n/g, '\\n') + '»')
        } else if (typeof context === 'object' && context instanceof ProstoParseNodeContext) {
            let keys = ''
            Object.keys(context.customContent).forEach(key => {
                const val = context.customContent[key]
                if (typeof val === 'string' || typeof val === 'number') {
                    keys += ' ' + styles.valuesDim(key + '(') + styles.values(val.toString()) + styles.valuesDim(')')
                } else if (Array.isArray(val)) {
                    keys += ' ' + styles.valuesDim(key + `[${ val.length }]`)
                } else if (typeof val === 'object') {
                    keys += ' ' + styles.valuesDim(`{ ${ key } }`)
                }
            })
            return styles.node(context.icon + (context.label ? ' ' : '')) + styles.nodeDim(context.label) + keys
        }
        return ''
    },
})
