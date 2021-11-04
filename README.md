<p align="center">
<img src="./docs/logo.png" width="100%" style="max-width: 900px" />
<a  href="https://github.com/prostojs/parser/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-cyan?style=for-the-badge" />
</a>
</p>

Do you need to parse something? Parse anything!

This is not some ready to go solution for parsing specific formats. This is a **"LEGO"** among parsers as it's wide configurable. Consider using this parser if you want to parse something you can't find a parser for. But be **patient** as you'll have to understand the principles of its work.

**The @prostojs/parser solves the following tasks:**

1. Looping through the tokens in order to find the match for the next node;
2. Optimizing the number for RegExp.exec calls;
3. Stacking the nodes;
4. Encapsulating nodes logic;
5. Hoisting the parsed content from children;
6. Flattening recursive nodes;
7. Merging children nodes with parent;
8. Enhancing nodes with `customData` that you define;
9. Errors handling with displaying readable error messages with references to the error cause;
10. Displaying parsed tree as tree for quick debugging;

**The core parts of @prostojs/parser:**

1. The node descriptor (`ProstoParserNode`) which contains the original parsing configuration for the node like:
    - start/end tokens
    - omit/eject rules for tokens
    - skip/bad tokens
    - hoisting/merging options
    - diiferent kinds of callbacks for parser hooks
2. The node context (`ProstoParserNodeContext`) which serves the following:
    - cloning the configuration from node descriptor for each node instance that has to be parsed
    - storing the `customData`
    - mutating the configuration during its lifetime
    - processing parser hooks callbacks
3. The parser context (`ProstoParserContext`) which serves for:
    - managing the main part with going through the source and parse
    - new node contexts creation
    - managing the node start/end logic
    - pushing/popping the nodes to/from stack
    - firing the hooks
    - handling the errors

## Install

npm: 

`npm install @prostojs/parser`

Via CDN:
```
<script src="https://unpkg.com/@prostojs/tree"></script>
<script src="https://unpkg.com/@prostojs/parser"></script>
```

## Usage

The parser contains of different nodes. There's a node class `ProstoParserNode` which lays underneath of each node.
It has more simplistic wrapper `BasicNode` which I'll be using in the example below. 

**Let's solve a task of parsing xml/html format** with some templating baked in it (just like vuejs).

1. Let's create the root node. It's nothing more than just a dummy-container node.

```ts
import { BasicNode } from '@prostojs/parser'

const rootNode = new BasicNode({ icon: 'ROOT' })
    // add a hook on when some text content is added to the root node
    // and trim and remove extra spaces as it shouldn't matter 
    // for html/xml
    .onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))
```

2. HTML page must start with `<!DOCTYPE ...` thing. Let's just create another
very basic node for it:
```ts
const docTypeNode = new BasicNode({
    // specifying the label for tree view
    label: 'Document Type',
    // specifying the start and end tokens
    // [<startToken>, <endToken>]
    tokens: ['<!DOCTYPE ', '>'],
    // token Omit/Eject options
    // specifying `omit-omit` in order
    // to get rid of the matched tokens
    // (not to copy them to a node content)
    tokenOE: 'omit-omit',
})
```
3. Another basic node would be `<![CDATA[...`:
```ts
const cDataNode = new BasicNode({
    // specifying icon (just like a label)
    // for tree view only
    icon: '<![CDATA[',
    // start/end token
    tokens: ['<![CDATA[', ']]>'],
    // token Omit/Eject options are
    // the same as above
    tokenOE: 'omit-omit',
})
```

4. Comment node `<!-- -->` will be very simple as well:

```ts
const commentNode = new BasicNode({
    // label only for tree view
    label: 'comment',
    // icon only for tree view
    icon: '“',
    // start/end tokens
    tokens: ['<!--', '-->'],
    // Omit/Eject options for tokens
    tokenOE: 'omit-omit',
})
```

5. Let's get to a little bit more advanced stuff.
The string node can start with `'`, `"` or \` quote (not really in html, but let's cover this case).
And we want to ignore the backslashed quote inside the node: `'text \\'escaped\\''`.

    This time we will pass a `customData` type (each node can have a custom data in it) with `{ quote: string }` type. We're doing so to keep the starting quote in order to properly match the ending quote.

    Why do we need it in HTML? We don't really. But it will be useful for the templating part...

```ts
// Using BasicNode with typed customData:
const stringNode = new BasicNode<{ quote: string }>({
    label: '',
    icon: '"',
    tokens: [
        // This time we use RegExp for starting token.
        // The named capturing group with name `quote`
        // will take care of copying the `quote` to
        // the `customData.quote`
        /(?<quote>["'`])/,
        // For ending token we use a function
        // that returns the quote that was 
        // saved when the starting token matched.
        // The context object is the runtime artifact
        // of this particular node match
        // instantiated by the `stringNode` itself.
        context => context.getCustomData().quote || '',
    ],
    // saying that we want to ignore backslashed
    // end token
    backSlash: '-ignore',
})
```

6. Now let's get to HTML tag's attributes and its values. We want to support unquoted attribute values as well as quoted ones.

```ts
// Using BasicNode with typed customData for `valueNode`:
const valueNode = new BasicNode<{ quote: string }>({
    label: 'value',
    icon: '=',
    // Almost same as `stringNode` but prefixed with `=` 
    tokens: [/=(?<quote>["'`])/, context => context.getCustomData().quote || '' ],
    // In our version of parser we will ignore backslashed ending quote
    // (in real HTML it is not ignored)
    backSlash: '-ignore',
    // Omitting both the tokens from the node content
    tokenOE: 'omit-omit',
})

// Using BasicNode with typed customData for `unquotedValueNode`:
const unquotedValueNode = new BasicNode<{ quote: string }>({
    label: 'value',
    icon: '=',
    // This time we use special name `content` for capturing group
    // You might noticed it does not appear on the type.
    // It's because this is the only reserved group name
    // that pushes the matched result directly
    // to the node content. This is how we match the node
    // and fill up its content at the same step.
    tokens: [/=(?<content>\w+)/, /[\s\/\>]/ ],
    // Omit the start token and eject the end token.
    // Why do we eject this time? Because the end token
    // may be `>` or `/>`. Our parent node might want
    // to process this tokens as well. In order to pass this
    // part of the source string to the ancestor
    // we command to "eject" it.
    tokenOE: 'omit-eject',
})

// Using BasicNode with typed customData for `attrNode`:
// Our attribute will have `key` and `value` in its
// custom data
const attrNode = new BasicNode<{ key: string, value: string }>({
    label: 'attribute',
    icon: '=',
    // The `key` will be pushed right from the
    // start token due to named capturing group.
    tokens: [/(?<key>[\w:\-\.]+)/, /[\s\n\/>]/],
    // Omitting the start token and ejecting (pushing out)
    // the end token in order to let the ancestor node
    // process it.
    tokenOE: 'omit-eject',
})
    // Instructing the node that it has to "pop out"
    // right after it processed the `unquotedValueNode`
    // or `valueNode` nodes.
    // "Pop out" means to end parsing itself
    // and get to the ancestor (pop it from stack).
    .addPopsAfterNode(unquotedValueNode, valueNode)
    // Instructing the node to absorb the data
    // from its children `[unquotedValueNode, valueNode]`
    // with the rule `join->value` which means that
    // the children's content will be joined (.join(''))
    // and saved to the customData.value of this node.
    .addAbsorbs([unquotedValueNode, valueNode], 'join->value')
```

7. Let's get to the string interpolation templates. Anywhere in html we can type `{{ a + b }}` which
will be interpreted as an expression node:

```ts
// Using BasicNode with typed customData for `expression`:
const expression = new BasicNode<{ expression: string }>({
    label: 'string',
    icon: '≈',
    // using mustache notation (like in vuejs)
    tokens: ['{{', '}}' ],
    // and we definetelly want to omit those mustaches
    tokenOE: 'omit-omit',
})
    // Again absorbing the child node `stringNode`
    // This time the rule `join` will only
    // join the `stringNode` content (.join(''))
    // and append it to this node's content.
    // We use `stringNode` here handle backslashed
    // quotes properly
    .addAbsorbs(stringNode, 'join')
    // Let's map the content to the customData.expression
    // and clear the content. The rule `join-clear` will
    // do the job perfectly.
    .mapContent('expression', 'join-clear')
```

8. Each tag is going to have some inner data (strings and other nodes or comments).

```ts
const innerNode = new BasicNode({
    label: 'inner',
    // Inner node starts with `>` (when the opening tag ends)
    // end ends with `</` (when the closing tag starts)
    tokens: ['>', '</'],
    // The first one we must omit.
    // The second one we must eject, otherwise
    // our `tag` node will never end.
    tokenOE: 'omit-eject',
})
    // On each new string we will trim it and remove extra spaces
    // as we don't really care for them.
    .onAppendContent(s => s.trim().replace(/\n/g, ' ').replace(/\s+/, ' '))
```

9. The most complex node is the `tag` node. There's actually several variations about it. It can be so-called "void" tag which does not have any `inner` and isn't supposed to have closing tag (meta, img, ...).

    It can also be so-called "text" tag which has only text (style, script).

    And finally it can be a regular tag with optional inner part.

    It might be better and more transparent to create 3 corresponding node types to cover those 3 scenarios. But in this example I'll go for 1 node covering all 3 scenarios to show how actually flexible this parser is.

```ts
const htmlVoidTags = [
    'area','base','br','col',
    'command','embed','hr','img',
    'input','keygen','link',
    'meta','param','source','track','wbr',
]
const htmlTextTags = ['script', 'style']

// Using BasicNode with typed customData for `tagNode`.
// We will store flags `isText` and `isVoid`, the opening tag as `tag` and
// the closing tag as `endTag`.
// We don't really need the closing tag but we will use it for 
// checks that opening tag matches the closing tag.
const tagNode = new BasicNode<{ isText: boolean, isVoid: boolean, tag: string, endTag?: string }>({
    tokens: [
        // The starting token is simple.
        // It's just a named capturing group with 
        // proper caharcters after `<`
        /<(?<tag>[\w:\-\.]+)/,
        // The ending token is more complex
        // and it varies for all 3 scenarios.
        ({ customData }) => {
            // The Void tag ends with just `>` or `/>`
            if (customData.isVoid) return /\/?>/
            // The text tag ends with exact match to the opening tag
            if (customData.isText) return new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`)
            // And the regular tag ends with `/>` or `</...>`
            // We use named capturing group here to store the
            // closing tag in customData.endTag.
            // We could specify the exact match with opening
            // tag as we did for text tag above but then
            // in case if closing tag has typo
            // we won't match it at all.
            // We want to match any closing tag and then
            // check if it matches to opening tag
            // and throw an error if it doesn't
            return /(?:\/\>|\<\/(?<endTag>[\w:\-\.]+)\s*\>)/
        },
    ],
    // Omit both tokens
    tokenOE: 'omit-omit',
    // Ignore the spaces so the node like this
    // `<div  attr="value"   >` will look like
    // `<div attr="value">
    skipToken: /\s/,
})
    // onMatch hook triggers when the node matched
    // and its context was just created
    .onMatch(({ context, customData }) => {
        // only for tree view we store the tag
        // as the icon which is very easy to see
        // when printing a tree
        context.icon = customData.tag,
        // checking if the tag is a void or a text one
        customData.isVoid = htmlVoidTags.includes(customData.tag)
        customData.isText = htmlTextTags.includes(customData.tag)
        if (customData.isVoid) {
            // in case of void tag we get rid
            // of `innerNode` (disable this context
            // to recognize any `innerNode`)
            context.clearRecognizes(innerNode)
        }
        if (customData.isText) {
            // in case of text tag we want to 
            // absorb the `innerNode` content
            // to this node content (just to avoid
            // extra node that will carry only text data)
            context.addAbsorbs(innerNode, 'join')
        }
    })
    // onBeforeChildParse hook triggers when parser
    // matched the child and is about to start parsing it.
    // The child context is already created.
    .onBeforeChildParse((childContext, { context, customData }) => {
        if (customData.isText && childContext.node === innerNode) {
            // in case of text node we want the `innerNode`
            // to store only text data so we
            // remove all the nodes from its 
            // `recognizes` option
            childContext.clearRecognizes()
            // we also don't want the `innerNode` to trim
            // the text so we get rid of its onAppendContent hook
            childContext.removeOnAppendContent()
            // clear the skip token of this node
            // in order not to skip spaces
            context.clearSkipToken()
            // finally instructing the `innerNode`
            // to end only when full match for opening tag
            // is met
            childContext.endsWith = {
                token: new RegExp(`<\\/(?<endTag>${ escapeRegex(customData.tag) })\\s*>`),
                eject: true,
            }
        }
    })
    // onAfterChildParse hook triggers when parser
    // enountered the end condition for the child.
    .onAfterChildParse((childContext, { context }) => {
        if (childContext.node === innerNode) {
            // If `innerNode` just ended we get
            // rid of any in this node `recognizes`
            // option as we do not expect to meet
            // any other child node.
            context.clearRecognizes()
        }
    })
    // popsAtEOFSource options tells the parser
    // that this node can end with the file
    // (we don't really need it here)
    .popsAtEOFSource(true)
    // onPop hook triggers when this node met the
    // ending condition and pops out.
    .onPop(({ customData: { isVoid, tag, endTag }, parserContext }) => {
        if (!isVoid && typeof endTag === 'string' && tag !== endTag) {
            // Here we check that the closing tag matches the opening tag
            // (only for non-void tags and only if it is not a innerless 
            // version like <div />)
            // `panicBlock` method of the `parserContext`
            // throws an error with printing the corresponding 
            // source lines
            parserContext.panicBlock(
                `Open tag <${ tag }> and closing tag </${ endTag }> must be equal.`,
                // we must point the parser
                // on where is the start of problem
                // (tag.length - is the length of opening tag
                // so we step back to it's length)
                tag.length || 0,
                // same for closing block 
                // we step back to point to the
                // beginning of the closing tag
                endTag.length + 1,
            )
        }
    })
    // Finally add nodes that should be recognized by this node
    // Sometimes we skip this step if we already used 
    // `addPopsAfterNode` or `addAbsorbs` methods, they trigger
    // `addRecognizes` automatically as they do not make sense
    // if they do not recognize the nodes mentioned there
    .addRecognizes(innerNode, attrNode)
```

10. The final part is to add `recognizable` nodes to the rest of the nodes and parse something...

```ts
// `rootNode` must recognize `docTypeNode`, `commentNode`, `tagNode`, `expression`
rootNode.addRecognizes(docTypeNode, commentNode, tagNode, expression)
// `innerNode` must recognize `commentNode`, `cDataNode`, `tagNode`, `expression`
innerNode.addRecognizes(commentNode, cDataNode, tagNode, expression)
// `commentNode` must recognize only `expression`
commentNode.addRecognizes(expression)
// `cDataNode` must recognize only `expression` as well
cDataNode.addRecognizes(expression)

// Now it's ready to parse.
// The result here is the `ProstoParserNodeContext` of the rootNode
const result = rootNode.parse('...your html goes here...')

// An easy way to visualize the result is `toTree` method.
// Each instance of `ProstoParserNodeContext` has this method
// so you can render any nested node context to tree as well.
console.log(result.toTree())
```

If we try to parse this one
```html
<!DOCTYPE html>
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

<h1>My First Heading</h1>
<p>My first paragraph.</p>
<div class="big small text" title="div title 123">
    <div class="nested" v-for="item of items" p:prefixed="value1">
        <img src="picture.png" class="void-tag" >
        <span style="display: block"> this is my {{ item.index }} line </span>
    </div>
</div>

</body>
</html>
```

We'll end up with this result
```
ROOT
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
      │        └─ «\n                    .bg-red {\n                        background-co…»
      └─ body tag(body) endTag(body)
         └─ ◦ inner
            ├─ h1 tag(h1) endTag(h1)
            │  └─ ◦ inner
            │     └─ «My First Heading»
            ├─ p tag(p) endTag(p)
            │  └─ ◦ inner
            │     └─ «My first paragraph.»
            └─ div tag(div) endTag(div)
               ├─ = attribute key(class) value(big small text)
               ├─ = attribute key(title) value(div title 123)
               └─ ◦ inner
                  └─ div tag(div) endTag(div)
                     ├─ = attribute key(class) value(nested)
                     ├─ = attribute key(v-for) value(item of items)
                     ├─ = attribute key(p:prefixed) value(value1)
                     └─ ◦ inner
                        ├─ img tag(img) isVoid☑
                        │  ├─ = attribute key(src) value(picture.png)
                        │  └─ = attribute key(class) value(void-tag)
                        └─ span tag(span) endTag(span)
                           ├─ = attribute key(style) value(display: block)
                           └─ ◦ inner
                              ├─ «this is my»
                              ├─ ≈ string expression( item.index )
                              └─ «line»
```

## Understanding the node options

coming soon...