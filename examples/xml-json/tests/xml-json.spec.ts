import { describe, it, expect } from 'vitest'
import { createXmlJsonParser, parseXmlJson } from '../src/xml-json'

describe('xml-json parser', () => {
    // --- Basic structure ---
    describe('basic structure', () => {
        it('should parse a simple element with text', () => {
            const result = parseXmlJson('<root>hello</root>')
            expect(result).toEqual({ root: 'hello' })
        })

        it('should parse nested elements', () => {
            const result = parseXmlJson('<root><child>text</child></root>')
            expect(result).toEqual({ root: { child: 'text' } })
        })

        it('should parse self-closing elements', () => {
            const result = parseXmlJson('<root><empty/></root>')
            expect(result).toEqual({ root: { empty: '' } })
        })

        it('should parse empty elements', () => {
            const result = parseXmlJson('<root></root>')
            expect(result).toEqual({ root: '' })
        })

        it('should parse multiple children with same name as array', () => {
            const result = parseXmlJson('<root><item>a</item><item>b</item></root>')
            expect(result).toEqual({ root: { item: ['a', 'b'] } })
        })

        it('should parse mixed content (text + elements)', () => {
            const result = parseXmlJson('<root>before<child>inner</child>after</root>')
            expect(result.root.child).toBe('inner')
            expect(result.root['#text']).toBeDefined()
        })

        it('should parse deeply nested structure', () => {
            const result = parseXmlJson('<a><b><c><d>deep</d></c></b></a>')
            expect(result).toEqual({ a: { b: { c: { d: 'deep' } } } })
        })
    })

    // --- Attributes ---
    describe('attributes', () => {
        it('should parse attributes with default prefix', () => {
            const result = parseXmlJson('<root attr="value"/>')
            expect(result).toEqual({ root: { '@_attr': 'value' } })
        })

        it('should parse multiple attributes', () => {
            const result = parseXmlJson('<root a="1" b="2"/>')
            expect(result).toEqual({ root: { '@_a': '1', '@_b': '2' } })
        })

        it('should merge attributes and children', () => {
            const result = parseXmlJson('<root id="1"><child>text</child></root>')
            expect(result).toEqual({ root: { '@_id': '1', child: 'text' } })
        })

        it('should use custom attribute prefix', () => {
            const result = parseXmlJson('<root attr="val"/>', { attributeNamePrefix: '$' })
            expect(result).toEqual({ root: { '$attr': 'val' } })
        })

        it('should use empty attribute prefix', () => {
            const result = parseXmlJson('<root attr="val"/>', { attributeNamePrefix: '' })
            expect(result).toEqual({ root: { attr: 'val' } })
        })

        it('should ignore attributes when configured', () => {
            const result = parseXmlJson('<root id="1" class="x">text</root>', { ignoreAttributes: true })
            expect(result).toEqual({ root: 'text' })
        })

        it('should parse attribute values as numbers when configured', () => {
            const result = parseXmlJson('<root count="42" rate="3.14" name="hello"/>', {
                parseAttributeValue: true,
            })
            expect(result.root['@_count']).toBe(42)
            expect(result.root['@_rate']).toBe(3.14)
            expect(result.root['@_name']).toBe('hello')
        })

        it('should parse single-quoted attributes', () => {
            const result = parseXmlJson("<root attr='value'/>")
            expect(result).toEqual({ root: { '@_attr': 'value' } })
        })

        it('should decode entities in attribute values', () => {
            const result = parseXmlJson('<root attr="a&amp;b"/>')
            expect(result.root['@_attr']).toBe('a&b')
        })
    })

    // --- Text handling ---
    describe('text handling', () => {
        it('should parse tag values as numbers by default', () => {
            const result = parseXmlJson('<root><price>10.99</price><count>42</count></root>')
            expect(result.root.price).toBe(10.99)
            expect(result.root.count).toBe(42)
        })

        it('should parse booleans in tag values by default', () => {
            const result = parseXmlJson('<root><active>true</active><deleted>false</deleted></root>')
            expect(result.root.active).toBe(true)
            expect(result.root.deleted).toBe(false)
        })

        it('should keep tag values as strings when parseTagValue is false', () => {
            const result = parseXmlJson('<root><price>10.99</price></root>', { parseTagValue: false })
            expect(result.root.price).toBe('10.99')
        })

        it('should trim values by default', () => {
            const result = parseXmlJson('<root><item>  hello  </item></root>')
            expect(result.root.item).toBe('hello')
        })

        it('should preserve whitespace when trimValues is false', () => {
            const result = parseXmlJson('<root><item>  hello  </item></root>', {
                trimValues: false,
                parseTagValue: false,
            })
            expect(result.root.item).toBe('  hello  ')
        })

        it('should decode entities in text content', () => {
            const result = parseXmlJson('<root>&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;</root>', {
                parseTagValue: false,
            })
            expect(result.root).toBe('<b>bold</b> & "quoted"')
        })

        it('should decode numeric character references', () => {
            const result = parseXmlJson('<root>&#65;&#x42;</root>', { parseTagValue: false })
            expect(result.root).toBe('AB')
        })

        it('should use custom text node name', () => {
            const result = parseXmlJson('<root>before<child/>after</root>', { textNodeName: '_text' })
            expect(result.root._text).toBeDefined()
            expect(result.root.child).toBe('')
        })
    })

    // --- CDATA ---
    describe('CDATA', () => {
        it('should merge CDATA into text by default', () => {
            const result = parseXmlJson('<root><![CDATA[raw <content>]]></root>', { parseTagValue: false })
            expect(result.root).toBe('raw <content>')
        })

        it('should use cdataPropName when configured', () => {
            const result = parseXmlJson('<root><![CDATA[raw]]></root>', { cdataPropName: '__cdata' })
            expect(result.root).toEqual({ __cdata: 'raw' })
        })

        it('should handle CDATA inside nested elements', () => {
            const result = parseXmlJson(
                '<root><desc><![CDATA[<p>HTML</p>]]></desc></root>',
                { cdataPropName: '#cdata' },
            )
            expect(result.root.desc).toEqual({ '#cdata': '<p>HTML</p>' })
        })
    })

    // --- Comments ---
    describe('comments', () => {
        it('should discard comments by default', () => {
            const result = parseXmlJson('<root><!-- comment -->text</root>')
            expect(result.root).toBe('text')
        })

        it('should include comments when commentPropName is set', () => {
            const result = parseXmlJson(
                '<root><!-- hello --><child/></root>',
                { commentPropName: '#comment' },
            )
            expect(result.root['#comment']).toBe(' hello ')
        })

        it('should include top-level comments', () => {
            const result = parseXmlJson(
                '<!-- top --><root/>',
                { commentPropName: '__comment' },
            )
            expect(result.__comment).toBe(' top ')
        })
    })

    // --- XML Declaration ---
    describe('XML declaration', () => {
        it('should include declaration by default', () => {
            const result = parseXmlJson('<?xml version="1.0" encoding="UTF-8"?><root/>')
            expect(result['?xml']).toEqual({ version: '1.0', encoding: 'UTF-8' })
        })

        it('should ignore declaration when configured', () => {
            const result = parseXmlJson('<?xml version="1.0"?><root/>', { ignoreDeclaration: true })
            expect(result['?xml']).toBeUndefined()
        })
    })

    // --- Processing instructions ---
    describe('processing instructions', () => {
        it('should include PIs by default', () => {
            const result = parseXmlJson('<?xml version="1.0"?><?php echo "hi"?><root/>')
            expect(result['?php']).toBe('echo "hi"')
        })

        it('should ignore PIs when configured', () => {
            const result = parseXmlJson('<?xml version="1.0"?><?php echo "hi"?><root/>', {
                ignorePiTags: true,
            })
            expect(result['?php']).toBeUndefined()
        })
    })

    // --- DOCTYPE ---
    describe('DOCTYPE', () => {
        it('should parse DOCTYPE', () => {
            const result = parseXmlJson('<!DOCTYPE html><root/>')
            expect(result['!DOCTYPE']).toBe('html')
        })
    })

    // --- Namespace handling ---
    describe('namespaces', () => {
        it('should preserve namespace prefixes by default', () => {
            const result = parseXmlJson('<ns:root xmlns:ns="http://example.com"><ns:child>text</ns:child></ns:root>')
            expect(result['ns:root']).toBeDefined()
            expect(result['ns:root']['ns:child']).toBe('text')
        })

        it('should remove namespace prefixes when configured', () => {
            const result = parseXmlJson(
                '<ns:root xmlns:ns="http://example.com"><ns:child>text</ns:child></ns:root>',
                { removeNSPrefix: true },
            )
            expect(result.root).toBeDefined()
            expect(result.root.child).toBe('text')
        })

        it('should remove namespace from attributes too', () => {
            const result = parseXmlJson(
                '<root xml:lang="en"/>',
                { removeNSPrefix: true },
            )
            expect(result.root['@_lang']).toBe('en')
        })
    })

    // --- isArray ---
    describe('isArray option', () => {
        it('should force specified tags to be arrays', () => {
            const result = parseXmlJson('<root><item>one</item></root>', {
                isArray: (name) => name === 'item',
            })
            expect(result.root.item).toEqual(['one'])
        })

        it('should not affect tags not in isArray', () => {
            const result = parseXmlJson('<root><item>one</item><other>two</other></root>', {
                isArray: (name) => name === 'item',
            })
            expect(result.root.item).toEqual(['one'])
            expect(result.root.other).toBe('two')
        })
    })

    // --- Transform functions ---
    describe('transform functions', () => {
        it('should transform tag names', () => {
            const result = parseXmlJson('<Root><Child>text</Child></Root>', {
                transformTagName: (n) => n.toLowerCase(),
            })
            expect(result.root.child).toBe('text')
        })

        it('should transform attribute names', () => {
            const result = parseXmlJson('<root MyAttr="val"/>', {
                transformAttributeName: (n) => n.toLowerCase(),
            })
            expect(result.root['@_myattr']).toBe('val')
        })
    })

    // --- alwaysCreateTextNode ---
    describe('alwaysCreateTextNode', () => {
        it('should create text node for self-closing elements', () => {
            const result = parseXmlJson('<root><empty/></root>', { alwaysCreateTextNode: true })
            expect(result.root.empty).toEqual({ '#text': '' })
        })

        it('should create text node for empty elements', () => {
            const result = parseXmlJson('<root></root>', { alwaysCreateTextNode: true })
            expect(result.root).toEqual({ '#text': '' })
        })
    })

    // --- Factory reuse ---
    describe('createXmlJsonParser factory', () => {
        it('should create a reusable parser', () => {
            const parser = createXmlJsonParser({ attributeNamePrefix: '' })
            const r1 = parser('<root a="1"/>')
            const r2 = parser('<root a="2"/>')
            expect(r1.root.a).toBe('1')
            expect(r2.root.a).toBe('2')
        })
    })

    // --- Complex documents ---
    describe('complex documents', () => {
        it('should parse a full XML document similar to fast-xml-parser', () => {
            const parser = createXmlJsonParser({
                attributeNamePrefix: '',
                trimValues: false,
                parseTagValue: true,
                cdataPropName: '__cdata',
                commentPropName: '__comment',
            })

            const result = parser(`<?xml version="1.0" encoding="UTF-8"?>
<!-- A comment -->
<library>
    <book id="1" category="fiction">
        <title>The Great Gatsby</title>
        <author>F. Scott Fitzgerald</author>
        <price>10.99</price>
    </book>
    <book id="2" category="non-fiction">
        <title>A Brief History</title>
        <description><![CDATA[<p>About time &amp; space</p>]]></description>
    </book>
    <empty-tag/>
</library>`)

            expect(result['?xml']).toEqual({ version: '1.0', encoding: 'UTF-8' })
            expect(result.__comment).toBe(' A comment ')
            expect(Array.isArray(result.library.book)).toBe(true)
            expect(result.library.book).toHaveLength(2)
            expect(result.library.book[0].id).toBe('1')
            expect(result.library.book[0].title).toBe('The Great Gatsby')
            expect(result.library.book[0].price).toBe(10.99)
            expect(result.library.book[1].description.__cdata).toBe('<p>About time &amp; space</p>')
            expect(result.library['empty-tag']).toBe('')
        })

        it('should parse RSS-like feed', () => {
            const result = parseXmlJson(`<?xml version="1.0"?>
<rss version="2.0">
    <channel>
        <title>My Feed</title>
        <item><title>Post 1</title></item>
        <item><title>Post 2</title></item>
    </channel>
</rss>`)

            expect(result.rss['@_version']).toBe('2.0')
            expect(Array.isArray(result.rss.channel.item)).toBe(true)
            expect(result.rss.channel.item[0].title).toBe('Post 1')
            expect(result.rss.channel.item[1].title).toBe('Post 2')
        })

        it('should parse SVG-like document', () => {
            const result = parseXmlJson(`<svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40"/>
    <text x="50" y="55">SVG</text>
</svg>`, { attributeNamePrefix: '' })

            expect(result.svg.viewBox).toBe('0 0 100 100')
            expect(result.svg.circle.cx).toBe('50')
            expect(result.svg.text['#text']).toBe('SVG')
            expect(result.svg.text.x).toBe('50')
        })

        it('should handle 100 items', () => {
            let xml = '<root>'
            for (let i = 0; i < 100; i++) {
                xml += `<item id="${i}">value${i}</item>`
            }
            xml += '</root>'

            const result = parseXmlJson(xml)
            expect(result.root.item).toHaveLength(100)
            expect(result.root.item[0]['@_id']).toBe('0')
            expect(result.root.item[99]['@_id']).toBe('99')
        })
    })
})
