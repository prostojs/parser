import { ProstoParser } from './'
import { ProstoParseNode } from './node'
import { dye } from '@prostojs/dye'

const negativeLookBehindEscapingSlash = /[^\\][\\](\\\\)*$/
describe('ProstoParser', () => {
    it('must parse URI pattern expression', () => {
        enum ENode {
            STATIC,
            PARAM,
            REGEX,
            WILDCARD,
        }        
        
        const nodes = {
            root: new ProstoParseNode({
                id: ENode.STATIC,
                label: 'Static',
                recognizes: [ENode.PARAM, ENode.WILDCARD],
            }),
            param: new ProstoParseNode({
                id: ENode.PARAM,
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
                hoistChildren: [
                    {
                        as: 'regex',
                        id: ENode.REGEX,
                        removeFromContent: true,
                        deep: 1,
                        map: ({ content }) => content.join(''),
                    },
                ],
                mapContent: {
                    key: (content) => content.shift(),
                },
                popsAtEOFSource: true,
                popsAfterNode: ENode.REGEX,
                recognizes: [ENode.REGEX],
            }),
            regex: new ProstoParseNode({
                id: ENode.REGEX,
                label: 'RegEx',
                startsWith: {
                    token: '(',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                },
                endsWith: {
                    token: ')',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                },
                mergeWith: [
                    {
                        parent: ENode.REGEX,
                        join: true,
                    },
                ],
                recognizes: [ENode.REGEX],
                onMatch({ rootContext, context }) {
                    if (rootContext.fromStack()?.node.id === ENode.REGEX) {
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
                id: ENode.WILDCARD,
                label: 'Wildcard',
                startsWith: {
                    token: '*',
                },
                endsWith: {
                    token: /[^*]/,
                    eject: true,
                },
                hoistChildren: [
                    {
                        as: 'regex',
                        id: ENode.REGEX,
                        removeFromContent: true,
                        deep: 1,
                        map: ({ content }) => content.join(''),
                    },
                ],
                mapContent: {
                    key: (content) => content.shift(),
                },
                popsAtEOFSource: true,
                popsAfterNode: ENode.REGEX,
                recognizes: [ENode.REGEX],
            }),
        }

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

    //     it('must parse html', () => {
    //         enum ENode {
    //             DOCUMENT,
    //             TAG,
    //             ATTRIBUTE,
    //             VALUE,
    //             INNER,
    //         }

    //         const parser = new ProstoParser<ENode>({
    //             rootNode: ENode.DOCUMENT,
    //             nodes: [
    //                 {
    //                     id: ENode.DOCUMENT,
    //                     label: 'Document',
    //                     skipToken: /^\s+/,
    //                     recognizes: [ENode.TAG],
    //                 },
    //                 {
    //                     id: ENode.TAG,
    //                     label: 'tag',
    //                     startsWith: {
    //                         token: '<',
    //                         negativeLookAhead: /^\//,
    //                         omit: true,
    //                     },
    //                     endsWith: {
    //                         token: /^(?:\/\>|\<\/\s*(\w+)\s*\>)/,
    //                         omit: true,
    //                         onMatchToken: ({ context, matched }) => {
    //                             context.endTagName = matched ? matched[1] : null
    //                             return true
    //                         },
    //                     },
    //                     skipToken: /^\s+/,
    //                     onPop({ context, error }) {
    //                         if (
    //                             typeof context.endTagName === 'string' &&
    //                             context.tagName !== context.endTagName
    //                         ) {
    //                             error(
    //                                 `Open tag <${context.tagName as string}> and closing tag </${context.endTagName}> must be equal`,
    //                             )
    //                         }
    //                     },
    //                     mapContent: {
    //                         tagName: (content) =>
    //                             (
    //                                 content.shift() as unknown as Record<
    //                                     string,
    //                                     string
    //                                 >
    //                             ).key,
    //                     },
    //                     recognizes: [ENode.ATTRIBUTE, ENode.INNER],
    //                 },
    //                 {
    //                     id: ENode.ATTRIBUTE,
    //                     label: 'attr',
    //                     startsWith: {
    //                         token: /^[a-zA-Z0-9\.\-\_]/,
    //                     },
    //                     endsWith: {
    //                         token: /^[\s\n\/>]/,
    //                         eject: true,
    //                     },
    //                     hoistChildren: [
    //                         {
    //                             id: ENode.VALUE,
    //                             as: 'value',
    //                             removeFromContent: true,
    //                             deep: 1,
    //                             map: ({ _content }) => _content.join(''),
    //                         },
    //                     ],
    //                     mapContent: {
    //                         key: (content) => content.shift(),
    //                     },
    //                     popsAfterNode: [ENode.VALUE],
    //                     recognizes: [ENode.VALUE],
    //                 },
    //                 {
    //                     id: ENode.VALUE,
    //                     label: 'value',
    //                     startsWith: {
    //                         token: '="',
    //                         omit: true,
    //                     },
    //                     endsWith: {
    //                         token: '"',
    //                         omit: true,
    //                         negativeLookBehind: negativeLookBehindEscapingSlash,
    //                     },
    //                     recognizes: [],
    //                 },
    //                 {
    //                     id: ENode.INNER,
    //                     label: 'inner',
    //                     startsWith: {
    //                         token: '>',
    //                         omit: true,
    //                     },
    //                     endsWith: {
    //                         token: '</',
    //                         eject: true,
    //                     },
    //                     recognizes: [ENode.TAG],
    //                 },
    //             ],
    //         })

    //         const result = parser.parse(`
    //             <div class="abcde" style="some: style" />  
    //             <span dense> some-text <p> PPP </p> </span>
    //             `.trim(),
    //         )
    //         console.log(result?.toTree(true))

//         expect(result).toMatchInlineSnapshot(`
// Object {
//   "_content": Array [
//     Object {
//       "_content": Array [
//         Object {
//           "_content": Array [],
//           "_icon": undefined,
//           "_index": 3,
//           "_label": "attr",
//           "_level": 2,
//           "_nodeId": 2,
//           "key": "class",
//           "value": "abcde",
//         },
//         Object {
//           "_content": Array [],
//           "_icon": undefined,
//           "_index": 5,
//           "_label": "attr",
//           "_level": 2,
//           "_nodeId": 2,
//           "key": "style",
//           "value": "some: style",
//         },
//       ],
//       "_icon": undefined,
//       "_index": 1,
//       "_label": "tag",
//       "_level": 1,
//       "_nodeId": 1,
//       "endTagName": undefined,
//       "tagName": "div",
//     },
//     Object {
//       "_content": Array [
//         Object {
//           "_content": Array [],
//           "_icon": undefined,
//           "_index": 9,
//           "_label": "attr",
//           "_level": 2,
//           "_nodeId": 2,
//           "key": "dense",
//         },
//         Object {
//           "_content": Array [
//             " some-text ",
//             Object {
//               "_content": Array [
//                 Object {
//                   "_content": Array [
//                     " PPP ",
//                   ],
//                   "_icon": undefined,
//                   "_index": 13,
//                   "_label": "inner",
//                   "_level": 4,
//                   "_nodeId": 4,
//                 },
//               ],
//               "_icon": undefined,
//               "_index": 11,
//               "_label": "tag",
//               "_level": 3,
//               "_nodeId": 1,
//               "endTagName": "p",
//               "tagName": "p",
//             },
//             " ",
//           ],
//           "_icon": undefined,
//           "_index": 10,
//           "_label": "inner",
//           "_level": 2,
//           "_nodeId": 4,
//         },
//       ],
//       "_icon": undefined,
//       "_index": 7,
//       "_label": "tag",
//       "_level": 1,
//       "_nodeId": 1,
//       "endTagName": "span",
//       "tagName": "span",
//     },
//   ],
//   "_icon": undefined,
//   "_index": 0,
//   "_label": "Document",
//   "_level": 0,
//   "_nodeId": 0,
//   "toTree": [Function],
// }
// `)
//     })
})
