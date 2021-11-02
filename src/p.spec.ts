import { dye } from '@prostojs/dye'
import { TProstoParserHoistOptions } from './p.types'
import { GenericCommentNode, GenericNode, GenericRootNode, GenericStringNode, GenericXmlAttributeNode, GenericXmlAttributeValue, GenericXmlInnerNode, GenericXmlTagNode } from './generic-nodes'
import { GenericStringExpressionNode } from './generic-nodes/string-expression-node'
import { ProstoParserNode } from './model'

describe('ProstoParser', () => {
    it('must parse URI pattern expression', () => {
        const nodes = {
            root: new GenericRootNode({ label: 'Static' }),
            param: new ProstoParserNode({
                label: 'Parameter',
                startsWith: {
                    token: ':',
                    ignoreBackSlashed: true,
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
            regex: new ProstoParserNode({
                label: 'RegEx',
                startsWith: {
                    token: '(',
                    ignoreBackSlashed: true,
                },
                endsWith: {
                    token: ')',
                    ignoreBackSlashed: true,
                },
                onMatch({ parserContext, context }) {
                    if (parserContext.fromStack()?.node.id === nodes.regex.id) {
                        if (!parserContext.here.startsWith('?:')) {
                            context.content[0] += '?:'
                        }
                    } else {
                        if (parserContext.here.startsWith('^')) {
                            parserContext.jump(1)
                        }
                    }
                },
            }),
            wildcard: new ProstoParserNode({
                label: 'Wildcard',
                startsWith: {
                    token: '*',
                },
                endsWith: {
                    token: /[^*\()]/,
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

        nodes.root.addRecognizes(nodes.param, nodes.wildcard)

        nodes.param.addRecognizes(nodes.regex)
        nodes.param.addPopsAfterNode(nodes.regex)
        nodes.param.addHoistChildren(hoistRegex)

        nodes.wildcard.addRecognizes(nodes.regex)
        nodes.wildcard.addPopsAfterNode(nodes.regex)
        nodes.wildcard.addHoistChildren(hoistRegex)

        nodes.regex.addRecognizes(nodes.regex)
        nodes.regex.addMergeWith({ parent: nodes.regex, join: true })

        const result = nodes.root.parse(
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
        const rootNode = new GenericXmlInnerNode({ trim: true, label: '', icon: 'ROOT' })
        const docTypeNode = new GenericNode({
            startToken: '<!DOCTYPE ',
            endToken: '>',
            label: 'Document Type',
        })
        const commentNode = new GenericCommentNode({
            block: true,
            delimiters: ['<!--', '-->'],
        })
        const cDataNode = new GenericCommentNode({
            block: true,
            delimiters: ['<![CDATA[', ']]>'],
            options: { label: '', icon: '<![CDATA[' },
        })
        const innerNode = new GenericXmlInnerNode({ trim: true, label: 'inner' })
        const tagNode = new GenericXmlTagNode({ innerNode })
        const valueNode = new GenericXmlAttributeValue(true)
        const attrNode = new GenericXmlAttributeNode({ valueNode })
        const stringNode = new GenericStringNode()
        const expression = new GenericStringExpressionNode(stringNode)
        
        rootNode.addRecognizes(docTypeNode, commentNode, tagNode, expression)
        innerNode.addRecognizes(commentNode, cDataNode, tagNode, expression)
        tagNode.addRecognizes(innerNode, attrNode)
        cDataNode.addRecognizes(expression)

        const result = rootNode.parse(`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>My test page</title>
            <!-- First Comment -->
            <style>
                .bg-red {
                    background-color: red;
                }
            </style>
        </head>
        <body>
            <!-- <div>commented div {{ value }}: {{ item.toUpperCase() }} </div> -->
            <img src="images/firefox-icon.png" :alt="'My test image ' + url">
            <div v-for="item of items">
                <a :href="item" />
                {{ item }}
            </div>
            <span v-if="condition" :class=""> condition 1 </span>
            <span v-else-if="a === 5"> condition 2 </span>
            <span v-else> condition 3 </span>
            <div unquoted=value><![CDATA[This text <div /> {{ a + 'b' }} </> contains a CEND ]]]]><![CDATA[>]]></div>
            <script>
                this is script <div> </div>
            </script>
            <div 
                dense="ab\\"de"
                :data-id="d.id"
                :data-count="d.count"
                :data-weight="d.w"
                :class="white ? 'white' : 'bg-white'"
            >
            inner text start
            {{ 'so good \\' }}' }}
            inner text end
            </div>
        </body>
        </html>`.trim(),
        )
        const tree = result.toTree()
        console.log(tree)

        expect(dye.strip(tree)).toMatchInlineSnapshot(`
"ROOT
├─ · Document Type
│  └─ «html»
└─ html tag(html) endTag(html)
   └─ ◦ inner
      ├─ head tag(head) endTag(head)
      │  └─ ◦ inner
      │     ├─ meta tag(meta) isVoid☑
      │     │  └─ = attribute key(charset) value(utf-8)
      │     ├─ title tag(title) endTag(title)
      │     │  └─ ◦ inner
      │     │     └─ «My test page»
      │     ├─ “ comment
      │     │  └─ « First Comment »
      │     └─ style tag(style) isText☑ endTag(style)
      │        └─ «\\\\n                .bg-red {\\\\n                    background-color: red;\\\\n                }\\\\n            »
      └─ body tag(body) endTag(body)
         └─ ◦ inner
            ├─ “ comment
            │  └─ « <div>commented div {{ value }}: {{ item.toUpperCase() }} </div> »
            ├─ img tag(img) isVoid☑
            │  ├─ = attribute key(src) value(images/firefox-icon.png)
            │  └─ = attribute key(:alt) value('My test image ' + url)
            ├─ div tag(div) endTag(div)
            │  ├─ = attribute key(v-for) value(item of items)
            │  └─ ◦ inner
            │     ├─ a tag(a)
            │     │  └─ = attribute key(:href) value(item)
            │     └─ ≈ string expression( item )
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute key(v-if) value(condition)
            │  ├─ = attribute key(:class) value()
            │  └─ ◦ inner
            │     └─ «condition 1»
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute key(v-else-if) value(a === 5)
            │  └─ ◦ inner
            │     └─ «condition 2»
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute key(v-else)
            │  └─ ◦ inner
            │     └─ «condition 3»
            ├─ div tag(div) endTag(div)
            │  ├─ = attribute key(unquoted) value(value)
            │  └─ ◦ inner
            │     ├─ <![CDATA[
            │     │  ├─ «This text <div /> »
            │     │  ├─ ≈ string expression( a + 'b' )
            │     │  └─ « </> contains a CEND ]]»
            │     └─ <![CDATA[
            │        └─ «>»
            ├─ script tag(script) isText☑ endTag(script)
            │  └─ «\\\\n                this is script <div> </div>\\\\n            »
            └─ div tag(div) endTag(div)
               ├─ = attribute key(dense) value(ab\\\\\\"de)
               ├─ = attribute key(:data-id) value(d.id)
               ├─ = attribute key(:data-count) value(d.count)
               ├─ = attribute key(:data-weight) value(d.w)
               ├─ = attribute key(:class) value(white ? 'white' : 'bg-white')
               └─ ◦ inner
                  ├─ «inner text start»
                  ├─ ≈ string expression( 'so good \\\\' }}' )
                  └─ «inner text end»
"
`)
    })
})
