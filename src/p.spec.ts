import { dye } from '@prostojs/dye'
import { TProstoParserHoistOptions } from './p.types'
import { GenericCommentNode, GenericNode, GenericRootNode, GenericStringNode, GenericXmlAttributeNode, GenericXmlAttributeValue, GenericXmlInnerNode, GenericXmlTagNode } from './generic-nodes'
import { GenericStringExpressionNode } from './generic-nodes/string-expression-node'
import { GenericRecursiveNode } from './generic-nodes/recursive-node'

describe('ProstoParser', () => {
    const regexNode = new GenericRecursiveNode({
        label: 'RegEx',
        tokens: ['(', ')'],
        backSlash: 'ignore-ignore',
    }).onMatch(({ parserContext, context }) => {
        if (parserContext.fromStack()?.node.id === context.node.id) {
            if (!parserContext.here.startsWith('?:')) {
                context.content[0] += '?:'
            }
        } else {
            if (parserContext.here.startsWith('^')) {
                parserContext.jump(1)
            }
        }
    })

    type TCustomContext = {
        key: string
        regex: string
    }
    
    const hoistRegex: TProstoParserHoistOptions<TCustomContext> = {
        as: 'regex',
        node: regexNode,
        onConflict: 'overwrite',
        mapRule: 'content.join',
        removeChildFromContent: true,
        deep: 1,
    }

    const paramNode = new GenericNode<TCustomContext>({
        label: 'Parameter',
        tokens: [':', /[\/\-]/],
        tokenOptions: 'omit-eject',
        backSlash: 'ignore-',
    }).mapContent('key', content => content.shift())
        .popsAtEOFSource(true)
        .addRecognizes(regexNode)
        .addPopsAfterNode(regexNode)
        .addHoistChildren(hoistRegex)
        .initCustomData(() => ({ key: '', regex: '([^\\/]*)' }))

    const wildcardNode = new GenericNode<TCustomContext>({
        label: 'Wildcard',
        tokens: ['*', /[^*\()]/],
        tokenOptions: '-eject',
    })
        .mapContent('key', content => content.shift())
        .popsAtEOFSource(true)
        .addRecognizes(regexNode)
        .addPopsAfterNode(regexNode)
        .addHoistChildren(hoistRegex)

    const pathParser = new GenericRootNode({ label: 'Static' })
        .addRecognizes(paramNode, wildcardNode)

    it('must parse URI pattern with first variable', () => {
        const tree = pathParser
            .parse(':variable')
            .toTree()
        console.log(tree)
        expect(dye.strip(tree)).toMatchInlineSnapshot(`
"ROOT Static
└─ ◦ Parameter key(variable) regex(([^\\\\/]*))
"
`)
    })

    it('must parse URI pattern expression', () => {
        const tree = pathParser
            .parse('/test/:name1-:name2(a(?:test(inside))b)/*(d)/test/*/:ending')
            .toTree()
        console.log(tree)
        expect(dye.strip(tree)).toMatchInlineSnapshot(`
"ROOT Static
├─ «/test/»
├─ ◦ Parameter key(name1) regex(([^\\\\/]*))
├─ «-»
├─ ◦ Parameter key(name2) regex((a(?:test(?:inside))b))
├─ «/»
├─ ◦ Wildcard regex((d)) key(*)
├─ «/test/»
├─ ◦ Wildcard key(*)
├─ «/»
└─ ◦ Parameter key(ending) regex(([^\\\\/]*))
"
`)
    })

    it('must parse html', () => {
        const rootNode = new GenericXmlInnerNode({ trim: true, label: '', icon: 'ROOT' })
        const docTypeNode = new GenericNode({
            label: 'Document Type',
            tokens: ['<!DOCTYPE ', '>'],
            tokenOptions: 'omit-omit',
        })
        const cDataNode = new GenericNode({
            tokens: ['<![CDATA[', ']]>'],
            label: '',
            icon: '<![CDATA[',
            tokenOptions: 'omit-omit',
        })
        const commentNode = new GenericCommentNode({
            block: true,
            delimiters: ['<!--', '-->'],
        })
        const innerNode = new GenericXmlInnerNode({ trim: true, label: 'inner' })
        const tagNode = new GenericXmlTagNode({ innerNode })
        const prefixedTagNode = new GenericXmlTagNode({ innerNode, prefix: 'p:'})
        const valueNode = new GenericXmlAttributeValue(true)
        const attrNode = new GenericXmlAttributeNode({ valueNode })
        const prefixedAttrNode = new GenericXmlAttributeNode({ valueNode, prefix: 'v-' })
        const stringNode = new GenericStringNode()
        const expression = new GenericStringExpressionNode(stringNode)
        
        rootNode.addRecognizes(docTypeNode, commentNode, prefixedTagNode, tagNode, expression)
        innerNode.addRecognizes(commentNode, cDataNode, prefixedTagNode, tagNode, expression)
        tagNode.addRecognizes(innerNode, prefixedAttrNode, attrNode)
        prefixedTagNode.addRecognizes(innerNode, prefixedAttrNode, attrNode)
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
            <p:prefixed> </p:prefixed>
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
├─ ◦ Document Type
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
            │  ├─ = attribute prefix(v-) key(for) value(item of items)
            │  └─ ◦ inner
            │     ├─ a tag(a)
            │     │  └─ = attribute key(:href) value(item)
            │     └─ ≈ string expression( item )
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute prefix(v-) key(if) value(condition)
            │  ├─ = attribute key(:class) value()
            │  └─ ◦ inner
            │     └─ «condition 1»
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute prefix(v-) key(else-if) value(a === 5)
            │  └─ ◦ inner
            │     └─ «condition 2»
            ├─ span tag(span) endTag(span)
            │  ├─ = attribute prefix(v-) key(else)
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
            ├─ prefixed prefix(p:) tag(prefixed) endTag(p:prefixed)
            │  └─ ◦ inner
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
