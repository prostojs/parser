import { dye } from '@prostojs/dye'
import { TProstoParserHoistOptions } from './p.types'
import { GenericCommentNode, GenericDummyNode, GenericRootNode, GenericStringNode, GenericXmlAttributeNode, GenericXmlAttributeValue, GenericXmlInnerNode, GenericXmlTagNode } from './generic-nodes'
import { GenericStringExpressionNode } from './generic-nodes/string-expression-node'
import { ProstoParserNode } from './model'

const negativeLookBehindEscapingSlash = /[^\\][\\](\\\\)*$/
describe('ProstoParser', () => {
    it('must parse URI pattern expression', () => {
        const nodes = {
            root: new ProstoParserNode({
                label: 'Static',
            }),
            param: new ProstoParserNode({
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
            regex: new ProstoParserNode({
                label: 'RegEx',
                startsWith: {
                    token: '(',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
                },
                endsWith: {
                    token: ')',
                    negativeLookBehind: negativeLookBehindEscapingSlash,
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
        const rootNode = new GenericRootNode()
        const docTypeNode = new GenericDummyNode({
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
        const innerNode = new GenericXmlInnerNode()
        const tagNode = new GenericXmlTagNode({ innerNode })
        const valueNode = new GenericXmlAttributeValue(true)
        const attrNode = new GenericXmlAttributeNode({ valueNode })
        const stringNode = new GenericStringNode()
        const expression = new GenericStringExpressionNode(stringNode)
        
        rootNode.addRecognizableNode(docTypeNode, commentNode, tagNode, expression)
        innerNode.addRecognizableNode(commentNode, cDataNode, tagNode, expression)
        tagNode.addRecognizableNode(innerNode, attrNode)
        cDataNode.addRecognizableNode(expression)

        const result = rootNode.parse(`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>My test page</title>
            <!-- First Comment -->
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
            <div 
                dense="ab\\"de"
                :data-id="d.id"
                :data-count="d.count"
                :data-weight="d.w"
                :class="white ? 'white' : 'bg-white'"
            >
            {{ 'so good \\' }}' }}
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
├─ «\\\\n        »
└─ html tag(html) endTag(html)
   └─ ◦ inner
      ├─ «\\\\n        »
      ├─ head tag(head) endTag(head)
      │  └─ ◦ inner
      │     ├─ «\\\\n            »
      │     ├─ meta tag(meta) isVoid☑
      │     │  ├─ « »
      │     │  └─ = attribute key(charset) value(utf-8)
      │     ├─ «\\\\n            »
      │     ├─ title tag(title) endTag(title)
      │     │  └─ ◦ inner
      │     │     └─ «My test page»
      │     ├─ «\\\\n            »
      │     ├─ “ comment
      │     │  └─ « First Comment »
      │     └─ «\\\\n        »
      ├─ «\\\\n        »
      ├─ body tag(body) endTag(body)
      │  └─ ◦ inner
      │     ├─ «\\\\n            »
      │     ├─ “ comment
      │     │  └─ « <div>commented div {{ value }}: {{ item.toUpperCase() }} </div> »
      │     ├─ «\\\\n            »
      │     ├─ img tag(img) isVoid☑
      │     │  ├─ « »
      │     │  ├─ = attribute key(src) value(images/firefox-icon.png)
      │     │  ├─ « »
      │     │  └─ = attribute key(:alt) value('My test image ' + url)
      │     ├─ «\\\\n            »
      │     ├─ div tag(div) endTag(div)
      │     │  ├─ « »
      │     │  ├─ = attribute key(v-for) value(item of items)
      │     │  └─ ◦ inner
      │     │     ├─ «\\\\n                »
      │     │     ├─ a tag(a)
      │     │     │  ├─ « »
      │     │     │  ├─ = attribute key(:href) value(item)
      │     │     │  └─ « »
      │     │     ├─ «\\\\n                »
      │     │     ├─ ≈ string expression( item )
      │     │     └─ «\\\\n            »
      │     ├─ «\\\\n            »
      │     ├─ span tag(span) endTag(span)
      │     │  ├─ « »
      │     │  ├─ = attribute key(v-if) value(condition)
      │     │  ├─ « »
      │     │  ├─ = attribute key(:class) value()
      │     │  └─ ◦ inner
      │     │     └─ « condition 1 »
      │     ├─ «\\\\n            »
      │     ├─ span tag(span) endTag(span)
      │     │  ├─ « »
      │     │  ├─ = attribute key(v-else-if) value(a === 5)
      │     │  └─ ◦ inner
      │     │     └─ « condition 2 »
      │     ├─ «\\\\n            »
      │     ├─ span tag(span) endTag(span)
      │     │  ├─ « »
      │     │  ├─ = attribute key(v-else)
      │     │  └─ ◦ inner
      │     │     └─ « condition 3 »
      │     ├─ «\\\\n            »
      │     ├─ div tag(div) endTag(div)
      │     │  ├─ « »
      │     │  ├─ = attribute key(unquoted) value(value)
      │     │  └─ ◦ inner
      │     │     ├─ <![CDATA[
      │     │     │  ├─ «This text <div /> »
      │     │     │  ├─ ≈ string expression( a + 'b' )
      │     │     │  └─ « </> contains a CEND ]]»
      │     │     └─ <![CDATA[
      │     │        └─ «>»
      │     ├─ «\\\\n            »
      │     ├─ div tag(div) endTag(div)
      │     │  ├─ « \\\\n                »
      │     │  ├─ = attribute key(dense) value(ab\\\\\\"de)
      │     │  ├─ «\\\\n                »
      │     │  ├─ = attribute key(:data-id) value(d.id)
      │     │  ├─ «\\\\n                »
      │     │  ├─ = attribute key(:data-count) value(d.count)
      │     │  ├─ «\\\\n                »
      │     │  ├─ = attribute key(:data-weight) value(d.w)
      │     │  ├─ «\\\\n                »
      │     │  ├─ = attribute key(:class) value(white ? 'white' : 'bg-white')
      │     │  ├─ «\\\\n            »
      │     │  └─ ◦ inner
      │     │     ├─ «\\\\n            »
      │     │     ├─ ≈ string expression( 'so good \\\\' }}' )
      │     │     └─ «\\\\n            »
      │     └─ «\\\\n        »
      └─ «\\\\n        »
"
`)
    })
})
