<p align="center">
<img src="./docs/logo.png" width="100%" style="max-width: 900px" />
<a  href="https://github.com/prostojs/logger/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-cyan?style=for-the-badge" />
</a>
</p>

Do you need to parse something? Parse anything!

This is fully configurable parser.

## Install

npm: `npm install @prostojs/parser`

Via CDN:
```
<script src="https://unpkg.com/@prostojs/dye"></script>
<script src="https://unpkg.com/@prostojs/tree"></script>
<script src="https://unpkg.com/@prostojs/logger"></script>
<script src="https://unpkg.com/@prostojs/parser"></script>
```

## Usage

First we have to describe all the nodes.
```js
const someNode = {
// required attributes:
    // `id` is required.
    // It is an unique identificator of the node type
    id: 0,

// optional attributes:
    // just a label that will be shown
    // when printing as a tree
    label: 'My Lovely Node',

    // start token description
    startsWith: '...', // see token description

    // end token description
    endsWith: '...', // see token description

    // this will tell the parser that this node
    // should end after it parsed child with id === 2
    popsAfterNode: 2,

    // this tells the parser to merge the content
    // of this node with parent id === 3
    // and not join with the last entry
    mergeWith: { parent: 3, join: false },

    // tokens that have to be ignored and
    // not stored to a content array
    skipToken: ' ', // can be array of strings or a regex

    // this is very important one
    // it tells the parser which nodes
    // can be recognized inside of this node
    recognizes: [5, 6, 7], // ids of nodes

    // if we want to hoist all the children
    // of specific type to this node
    // we must use this guy
    hoistChildren: { ... }, // see Hoist Options

    // we can map some of the content nodes
    // to a property of this node using
    // mapContent option
    mapContent: { mappedNode: (content) => ... },

    // callback when the node is parsed
    // and we popping to the parent node
    onPop: (data) => ...,

    // callback when the node start token matched
    // right before we start parsing it
    onMatch: (data) => ...,

    // callback when we have another children
    // as a plain text or a node to be added
    onAppendContent: (item, data) => ...,
}
```

All the nodes descriptors must passed as an array to parser options:

```js
const parser = new ProstoParser({
    rootNode: 0,
    nodes: arrayOfNodes,
})
```

Then you can start parsing:
```js
const parsed = parser.parse('...')
console.log(parsed.toTree()) // see the tree view of parsed content
```

Example of html parser:
```ts
const { ProstoParser } = require('@prostojs/parser')

enum ENode {
    DOCUMENT,
    TAG,
    ATTRIBUTE,
    VALUE,
    INNER,
}

const negativeLookBehindEscapingSlash = /[^\\][\\](\\\\)*$/

const parser = new ProstoParser<ENode>({
    rootNode: ENode.DOCUMENT,
    nodes: [
        {
            id: ENode.DOCUMENT,
            label: 'Document',
            skipToken: /^\s+/,
            recognizes: [ENode.TAG],
        },
        {
            id: ENode.TAG,
            label: 'tag',
            startsWith: {
                token: '<',
                negativeLookAhead: /^\//,
                omit: true,
            },
            endsWith: {
                token: /^(?:\/\>|\<\/\s*(\w+)\s*\>)/,
                omit: true,
                onMatchToken: ({ context, matched }) => {
                    context.endTagName = matched ? matched[1] : null
                },
            },
            skipToken: /^\s+/,
            onPop({ context, error }) {
                if (
                    typeof context.endTagName === 'string' &&
                    context.tagName !== context.endTagName
                ) {
                    error(
                        `Open tag <${context.tagName as string}> and closing tag </${context.endTagName}> must be equal`,
                    )
                }
            },
            mapContent: {
                tagName: (content) =>
                    (
                        content.shift() as unknown as Record<
                            string,
                            string
                        >
                    ).key,
            },
            recognizes: [ENode.ATTRIBUTE, ENode.INNER],
        },
        {
            id: ENode.ATTRIBUTE,
            label: 'attr',
            startsWith: {
                token: /^[a-zA-Z0-9\.\-\_]/,
            },
            endsWith: {
                token: /^[\s\n\/>]/,
                eject: true,
            },
            hoistChildren: [
                {
                    id: ENode.VALUE,
                    as: 'value',
                    removeFromContent: true,
                    deep: 1,
                    map: ({ _content }) => _content.join(''),
                },
            ],
            mapContent: {
                key: (content) => content.shift(),
            },
            popsAfterNode: [ENode.VALUE],
            recognizes: [ENode.VALUE],
        },
        {
            id: ENode.VALUE,
            label: 'value',
            startsWith: {
                token: '="',
                omit: true,
            },
            endsWith: {
                token: '"',
                omit: true,
                negativeLookBehind: negativeLookBehindEscapingSlash,
            },
            recognizes: [],
        },
        {
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
            recognizes: [ENode.TAG],
        },
    ],
})

const result = parser.parse(`
    <div class="abcde" style="some: style" />  
    <span dense> some-text <p> PPP </p> </span>
    `.trim(),
)
console.log(result?.toTree(true))
/*
console.log
◦ Document
├── ◦ tag tagName(div)
│   ├── ◦ attr value(abcde) key(class)
│   └── ◦ attr value(some: style) key(style)
└── ◦ tag endTagName(span) tagName(span)
    ├── ◦ attr key(dense)
    └── ◦ inner
        ├── « some-text »
        ├── ◦ tag endTagName(p) tagName(p)
        │   └── ◦ inner
        │       └── « PPP »
        └── « »
*/
```