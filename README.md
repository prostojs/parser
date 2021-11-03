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

Here's an example of XML (HTML) parser that uses so-called `generic nodes` which are just wrappers on top of `ProstoParserNode`:

```ts
// Each parser must start with some node which we call "root node"
// In this case we say it is a kind of "inner" node for HTML
// Option `trim` will trim the extra spaces  from teh content
const rootNode = new GenericXmlInnerNode({ trim: true, label: '', icon: 'ROOT' })

// HTML document starts with <!DOCTYPE... thing so let's create the
// node descriptor for it. `omit-omit` means that we're going to omit
// start and end tokens (we won't store them in the result)
const docTypeNode = new GenericNode({
    label: 'Document Type',
    tokens: ['<!DOCTYPE ', '>'],
    tokenOptions: 'omit-omit',
})

// XML can have <![CDATA[ part which stores any text data.
// We mustn't parse anything inside. So let'screate another node
// descriptor for it just like the previous one
const cDataNode = new GenericNode({
    tokens: ['<![CDATA[', ']]>'],
    label: '',
    icon: '<![CDATA[',
    tokenOptions: 'omit-omit',
})

// We mustn't forget about the comments
// We're using `GenericCommentNode` here
// `block` means that it is block comment
const commentNode = new GenericCommentNode({
    block: true,
    delimiters: ['<!--', '-->'],
})

// All the following nodes have their own generic classes
// due to some complexity in them. Not all of them required and posted
// here just to show the flexibility.
// For instance `prefixedTagNode` and `prefixedAttrNode` are totally optional
const innerNode = new GenericXmlInnerNode({ trim: true, label: 'inner' })
const tagNode = new GenericXmlTagNode({ innerNode })
const prefixedTagNode = new GenericXmlTagNode({ innerNode, prefix: 'p:'})
const valueNode = new GenericXmlAttributeValue(true)
const attrNode = new GenericXmlAttributeNode({ valueNode })
const prefixedAttrNode = new GenericXmlAttributeNode({ valueNode, prefix: 'v-' })
const stringNode = new GenericStringNode()

// This one isn't really HTML or XML one. I just like vue.js so
// this node represents the vue-like string expressions.
// Therefore this node is totally optional again
const expression = new GenericStringExpressionNode(stringNode)

// After all the nodes are created we must set the connections/assosiations
// on which node can do what with which node...
// `addRecognizes` enables the node to "recognize" other nodes while it's
// being parsed
rootNode.addRecognizes(docTypeNode, commentNode, prefixedTagNode, tagNode, expression)
innerNode.addRecognizes(commentNode, cDataNode, prefixedTagNode, tagNode, expression)
tagNode.addRecognizes(innerNode, prefixedAttrNode, attrNode)
prefixedTagNode.addRecognizes(innerNode, prefixedAttrNode, attrNode)
cDataNode.addRecognizes(expression)

// Here we are ready to parse.
// The result here is the `ProstoParserNodeContext` of the rootNode
const result = rootNode.parse('...your html goes here...')

// An easy way to visualize the result is `toTree` method.
// Each instance of `ProstoParserNodeContext` has thismethod
// so you can render any nested node context to tree as well
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
      │        └─ «\n                    .bg-red {\n              ...»
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
                     ├─ = attribute prefix(v-) key(for) value(item of items)
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