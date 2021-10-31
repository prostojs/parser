import { ProstoParser } from './'
import { ProstoParseNode } from './node'
import { dye } from '@prostojs/dye'
import { ProstoParseNodeContext } from './node-context'
import { TProstoParserHoistOptions } from './p.types'

const negativeLookBehindEscapingSlash = /[^\\][\\](\\\\)*$/
describe('ProstoParser', () => {
    it('must parse URI pattern expression', () => {
        const nodes = {
            root: new ProstoParseNode({
                label: 'Static',
            }),
            param: new ProstoParseNode({
                label: 'Parameter',
                startsWith: {
                    token: ':',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                    omit: true,
                },
                endsWith: {
                    token: ['/', '-'],
                    eject: true,
                },
                mapContent: {
                    key: (content) => content.shift(),
                },
                popsAtEOFSource: true,
            }),
            regex: new ProstoParseNode({
                label: 'RegEx',
                startsWith: {
                    token: '(',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                },
                endsWith: {
                    token: ')',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                },
                onMatch({ rootContext, context }) {
                    if (rootContext.fromStack()?.node.id === nodes.regex.id) {
                        if (!rootContext.here.startsWith('?:')) {
                            context.content[0] += '?:'
                        }
                    } else {
                        if (rootContext.here.startsWith('^')) {
                            rootContext.jump(1)
                        }
                    }
                },
            }),
            wildcard: new ProstoParseNode({
                label: 'Wildcard',
                startsWith: {
                    token: '*',
                },
                endsWith: {
                    token: /[^*]/,
                    eject: true,
                },
                mapContent: {
                    key: (content) => content.shift(),
                },
                popsAtEOFSource: true,
            }),
        }

        const hoistRegex: TProstoParserHoistOptions = {
            as: 'regex',
            node: nodes.regex,
            removeFromContent: true,
            deep: 1,
            map: ({ content }) => content.join(''),
        }

        nodes.root.addRecognizableNode(nodes.param, nodes.wildcard)

        nodes.param.addRecognizableNode(nodes.regex)
        nodes.param.addPopAfterNode(nodes.regex)
        nodes.param.addHoistChildren(hoistRegex)

        nodes.wildcard.addRecognizableNode(nodes.regex)
        nodes.wildcard.addPopAfterNode(nodes.regex)
        nodes.wildcard.addHoistChildren(hoistRegex)

        nodes.regex.addRecognizableNode(nodes.regex)
        nodes.regex.addMergeWith({ parent: nodes.regex, join: true })

        const parser = new ProstoParser({
            rootNode: nodes.root,
            nodes: Object.values(nodes),
        })

        const result = parser.parse(
            '/test/:name1-:name2(a(?:test(inside))b)/*(d)/test/*/:ending',
        )
        const tree = result.toTree()
        console.log(tree)
        expect(dye.strip(tree)).toMatchInlineSnapshot(`
"◦ Static
├─ «/test/»
├─ ◦ Parameter key(name1)
├─ «-»
├─ ◦ Parameter regex((a(?:test(?:inside))b)) key(name2)
├─ «/»
├─ ◦ Wildcard regex((d)) key(*)
├─ «/test/»
├─ ◦ Wildcard key(*)
├─ «/»
└─ ◦ Parameter key(ending)
"
`)
    })

    it('must parse html', () => {
        enum ENode {
            DOCUMENT,
            TAG,
            VOID_TAG,
            ATTRIBUTE,
            VALUE,
            INNER,
            COMMENT,
        }

        const htmlVoidTags = [
            'area',
            'base',
            'br',
            'col',
            'command',
            'embed',
            'hr',
            'img',
            'input',
            'keygen',
            'link',
            'meta',
            'param',
            'source',
            'track',
            'wbr',
        ]

        interface TTagData {
            tag: string,
            endtag: string | null,
        }

        const tag = new ProstoParseNode<TTagData>({
            id: ENode.TAG,
            label: '',
            startsWith: {
                token: /^<([^\s\>\/]+)/,
                // negativeLookAhead: /^\//,
                omit: true,
            },
            icon: '<>',
            onMatch({ matched, context, customData }) {
                customData.tag = matched[1]
                context.icon = matched[1]
            },
            endsWith: {
                token: /^(?:\/\>|\<\/\s*(\w+)\s*\>)/,
                omit: true,
                onMatchToken: ({ context, matched, customData }) => {
                    customData.endtag = matched ? matched[1] : null
                    return true
                },
            },
            skipToken: /^\s+/,
            badToken: /./,
            onPop({ customData, rootContext, context }) {
                if (
                    typeof customData.endtag === 'string' &&
                    customData.tag !== customData.endtag
                ) {
                    rootContext.panic(
                        `Open tag <${ customData.tag }> and closing tag </${ customData.endtag || '' }> must be equal.`,
                        customData.endtag.length + 1,
                    )
                }
                context.icon = '<' + customData.tag + '>'
            },
            recognizes: [ENode.INNER, ENode.ATTRIBUTE],
        })
        const voidTag = new ProstoParseNode<TTagData>({
            id: ENode.VOID_TAG,
            label: '',
            startsWith: {
                token: new RegExp('^<(' + htmlVoidTags.join('|') + ')[\\s\\>]'),
                omit: true,
            },
            onMatch({ matched, customData }) {
                customData.tag = (matched || [])[1]
            },
            endsWith: {
                token: /^\/?\>/,
                omit: true,
            },
            onPop({ context, customData }) {
                context.icon = '<' + customData.tag + '>'
            },
            skipToken: /^\s+/,
            mapContent: {},
            recognizes: [ENode.ATTRIBUTE],
        })

        const parser = new ProstoParser({
            rootNode: new ProstoParseNode({
                id: ENode.DOCUMENT,
                label: 'Document',
                skipToken: /^\s+/,
                recognizes: [ENode.COMMENT, ENode.VOID_TAG, ENode.TAG],
            }),
            nodes: [
                tag,
                voidTag,
                new ProstoParseNode({
                    id: ENode.COMMENT,
                    label: __DYE_WHITE__ + __DYE_DIM__ + 'comment',
                    icon: __DYE_WHITE__ + __DYE_DIM__ + '“',
                    startsWith: {
                        token: '<!--',
                        omit: true,
                    },
                    endsWith: {
                        token: '-->',
                        omit: true,
                    },
                    recognizes: [],
                }),
                new ProstoParseNode({
                    id: ENode.ATTRIBUTE,
                    label: 'attribute',
                    icon: '=',
                    startsWith: {
                        token: /^[a-zA-Z0-9\.\-\_\@]/,
                    },
                    endsWith: {
                        token: /^[\s\n\/>]/,
                        eject: true,
                    },
                    badToken: /^["'`\s]/i,
                    hoistChildren: [
                        {
                            node: ENode.VALUE,
                            as: 'value',
                            removeFromContent: true,
                            deep: 1,
                            map: ({ content }) => content.join(''),
                        },
                    ],
                    mapContent: {
                        key: (content) => content.shift(),
                    },
                    onPop({ context }) {
                        context.label = (context.getCustomData().key as string)
                    },
                    popsAfterNode: [ENode.VALUE],
                    recognizes: [ENode.VALUE],
                }),
                new ProstoParseNode({
                    id: ENode.VALUE,
                    label: 'value',
                    startsWith: {
                        token: ['="', '=\''],
                        omit: true,
                    },
                    onMatch({ matched, context }) {
                        context.getCustomData().quote = (matched && matched[0] || '')[1]
                    },
                    endsWith: {
                        token: ['"', '\''],
                        omit: true,
                        negativeLookBehind: negativeLookBehindEscapingSlash,
                        onMatchToken({ matched, context }) {
                            const quote = matched && matched[0] || ''
                            return quote === context.getCustomData().quote
                        },
                    },
                    recognizes: [],
                }),
                new ProstoParseNode({
                    id: ENode.INNER,
                    label: 'inner',
                    startsWith: {
                        token: '>',
                        omit: true,
                    },
                    endsWith: {
                        token: '</',
                        eject: true,
                    },
                    recognizes: [ENode.COMMENT, ENode.VOID_TAG, ENode.TAG],
                }),
            ],
        })

        const result = parser.parse(`<html>
        <head>
            <meta charset="utf-8">
            <title>My test page</title>
            <!-- First Comment -->
        </head>
        <body>
            <!-- <div>commented div {{= value =}}: {{= item.toUpperCase() =}} </div> -->
            <img src="images/firefox-icon.png" rw:alt="'My test image ' + url">
            <div rw-for="item of items">
                <a rw:href="item" />
                {{= item =}}
            </div>
            <span rw-if="condition" rw:class=""> condition 1 </span>
            <span rw-else-if="a === 5"> condition 2 </span>
            <span rw-else> condition 3 </span>
            <div 
                dense="ab\\"de"
                rw:data-id="d.id"
                rw:data-count="d.count"
                rw:data-weight="d.w"
                rw:class="white ? 'white' : 'bg-white'"
            >
            {{= 'so good \\' =}}' =}}
            </div>
        </body>
        </html>`.trim(),
        )
        const tree = result.toTree()
        console.log(tree)

        expect(dye.strip(tree)).toMatchInlineSnapshot(`
"◦ Document
└─ <html> tag(html) endtag(html)
   └─ ◦ inner
      ├─ «\\\\n        »
      ├─ <head> tag(head) endtag(head)
      │  └─ ◦ inner
      │     ├─ «\\\\n            »
      │     ├─ <meta> tag(meta)
      │     │  └─ = charset value(utf-8) key(charset)
      │     ├─ «\\\\n            »
      │     ├─ <title> tag(title) endtag(title)
      │     │  └─ ◦ inner
      │     │     └─ «My test page»
      │     ├─ «\\\\n            »
      │     ├─ “ comment
      │     │  └─ « First Comment »
      │     └─ «\\\\n        »
      ├─ «\\\\n        »
      ├─ <body> tag(body) endtag(body)
      │  └─ ◦ inner
      │     ├─ «\\\\n            »
      │     ├─ “ comment
      │     │  └─ « <div>commented div {{= value =}}: {{= item.toUpperCase() =}} </div> »
      │     ├─ «\\\\n            »
      │     ├─ <img> tag(img)
      │     │  ├─ = src value(images/firefox-icon.png) key(src)
      │     │  └─ = rw:alt value('My test image ' + url) key(rw:alt)
      │     ├─ «\\\\n            »
      │     ├─ <div> tag(div) endtag(div)
      │     │  ├─ = rw-for value(item of items) key(rw-for)
      │     │  └─ ◦ inner
      │     │     ├─ «\\\\n                »
      │     │     ├─ <a> tag(a)
      │     │     │  └─ = rw:href value(item) key(rw:href)
      │     │     └─ «\\\\n                {{= item =}}\\\\n            »
      │     ├─ «\\\\n            »
      │     ├─ <span> tag(span) endtag(span)
      │     │  ├─ = rw-if value(condition) key(rw-if)
      │     │  ├─ = rw:class value() key(rw:class)
      │     │  └─ ◦ inner
      │     │     └─ « condition 1 »
      │     ├─ «\\\\n            »
      │     ├─ <span> tag(span) endtag(span)
      │     │  ├─ = rw-else-if value(a === 5) key(rw-else-if)
      │     │  └─ ◦ inner
      │     │     └─ « condition 2 »
      │     ├─ «\\\\n            »
      │     ├─ <span> tag(span) endtag(span)
      │     │  ├─ = rw-else key(rw-else)
      │     │  └─ ◦ inner
      │     │     └─ « condition 3 »
      │     ├─ «\\\\n            »
      │     ├─ <div> tag(div) endtag(div)
      │     │  ├─ = dense value(ab\\\\\\"de) key(dense)
      │     │  ├─ = rw:data-id value(d.id) key(rw:data-id)
      │     │  ├─ = rw:data-count value(d.count) key(rw:data-count)
      │     │  ├─ = rw:data-weight value(d.w) key(rw:data-weight)
      │     │  ├─ = rw:class value(white ? 'white' : 'bg-white') key(rw:class)
      │     │  └─ ◦ inner
      │     │     └─ «\\\\n            {{= 'so good \\\\' =}}' =}}\\\\n            »
      │     └─ «\\\\n        »
      └─ «\\\\n        »
"
`)
    })
})
