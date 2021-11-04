import { dye } from '@prostojs/dye'
import { BasicNode } from './model/basic-node'
import { escapeRegex } from './utils'

describe('ProstoParser', () => {
    const regexNode = new BasicNode({
        label: 'RegEx',
        tokens: ['(', ')'],
        backSlash: 'ignore-ignore',
        recursive: true,
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

    const paramNode = new BasicNode<TCustomContext>({
        label: 'Parameter',
        tokens: [':', /[\/\-]/],
        tokenOE: 'omit-eject',
        backSlash: 'ignore-',
    }).mapContent('key', content => content.shift())
        .popsAtEOFSource(true)
        .addPopsAfterNode(regexNode)
        .addAbsorbs(regexNode, 'join->regex')
        .initCustomData(() => ({ key: '', regex: '([^\\/]*)' }))

    const wildcardNode = new BasicNode<TCustomContext>({
        label: 'Wildcard',
        tokens: ['*', /[^*\()]/],
        tokenOE: '-eject',
    })
        .mapContent('key', 'join-clear')
        .popsAtEOFSource(true)
        .addPopsAfterNode(regexNode)
        .addAbsorbs(regexNode, 'join->regex')

    const pathParser = new BasicNode({ label: 'Static', icon: 'ROOT' })
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
    
    const htmlTextTags = [
        'script',
        'style',
    ]

    it('must parse html', () => {
        const rootNode = new BasicNode({ icon: 'ROOT' })
            .onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))
        
        const docTypeNode = new BasicNode({
            label: 'Document Type',
            tokens: ['<!DOCTYPE ', '>'],
            tokenOE: 'omit-omit',
        })

        const cDataNode = new BasicNode({
            icon: '<![CDATA[',
            tokens: ['<![CDATA[', ']]>'],
            tokenOE: 'omit-omit',
        })

        const commentNode = new BasicNode({
            label: 'comment',
            icon: '“',
            tokens: ['<!--', '-->'],
            tokenOE: 'omit-omit',
        })

        const stringNode = new BasicNode<{ quote: string }>({
            label: '',
            icon: '"',
            tokens: [/(?<quote>["'`])/, context => context.getCustomData().quote || '' ],
            backSlash: '-ignore',
        })

        const valueNode = new BasicNode<{ quote: string }>({
            label: 'value',
            icon: '=',
            tokens: [/=(?<quote>["'`])/, context => context.getCustomData().quote || '' ],
            backSlash: '-ignore',
            tokenOE: 'omit-omit',
        })

        const unquotedValueNode = new BasicNode<{ quote: string }>({
            label: 'value',
            icon: '=',
            tokens: [/=(?<content>\w+)/, /[\s\/\>]/ ],
            tokenOE: 'omit-eject',
        })

        const attrNode = new BasicNode<{ key: string, value: string }>({
            label: 'attribute',
            icon: '=',
            tokens: [/(?<key>[\w:\-\.]+)/, /[\s\n\/>]/],
            tokenOE: 'omit-eject',
        })
            .addPopsAfterNode(unquotedValueNode, valueNode)
            .addAbsorbs([unquotedValueNode, valueNode], 'join->value')

        const expression = new BasicNode<{ expression: string }>({
            label: 'string',
            icon: '≈',
            tokens: ['{{', '}}' ],
            tokenOE: 'omit-omit',
        })
            .addAbsorbs(stringNode, 'join')
            .mapContent('expression', 'join-clear')

        const innerNode = new BasicNode({
            label: 'inner',
            tokens: ['>', '</'],
            tokenOE: 'omit-eject',
        }).onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))

        const tagNode = new BasicNode<{ isText: boolean, isVoid: boolean, tag: string, endTag?: string }>({
            tokens: [
                /<(?<tag>[\w:\-\.]+)/,
                ({ customData }) => {
                    if (customData.isVoid) return /\/?>/
                    if (customData.isText) return new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`)
                    return /(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/
                },
            ],
            tokenOE: 'omit-omit',
            skipToken: /\s/,
        })
            .onMatch(({ context, customData }) => {
                context.icon = customData.tag,
                customData.isVoid = htmlVoidTags.includes(customData.tag)
                customData.isText = htmlTextTags.includes(customData.tag)
                if (customData.isVoid) {
                    context.clearRecognizes(innerNode)
                }
                if (customData.isText) {
                    context.addAbsorbs(innerNode, 'join')
                }
            })
            .onBeforeChildParse((child, { context, customData }) => {
                if (customData.isText && child.node === innerNode) {
                    child.clearRecognizes()
                    child.removeOnAppendContent()
                    context.clearSkipToken()
                    child.endsWith = {
                        token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`),
                        eject: true,
                    }
                }
            })
            .onAfterChildParse((child, { context }) => {
                if (child.node === innerNode) {
                    context.clearRecognizes()
                }
            })
            // .popsAtEOFSource(true)
            .onPop(({ customData: { isVoid, tag, endTag }, parserContext }) => {
                if (!isVoid && typeof endTag === 'string' && tag !== endTag) {
                    parserContext.panicBlock(
                        `Open tag <${ tag }> and closing tag </${ endTag }> must be equal.`,
                        tag.length || 0,
                        endTag.length + 1,
                    )
                }
            })
            .addRecognizes(innerNode, attrNode)
        
        rootNode.addRecognizes(docTypeNode, commentNode, tagNode, expression)
        innerNode.addRecognizes(commentNode, cDataNode, tagNode, expression)
        commentNode.addRecognizes(expression)
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
      │        └─ «\\\\n                .bg-red {\\\\n                    background-color: red…»
      └─ body tag(body) endTag(body)
         └─ ◦ inner
            ├─ “ comment
            │  ├─ « <div>commented div »
            │  ├─ ≈ string expression( value )
            │  ├─ «: »
            │  ├─ ≈ string expression( item.toUpperCase() )
            │  └─ « </div> »
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
            ├─ p:prefixed tag(p:prefixed) endTag(p:prefixed)
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
