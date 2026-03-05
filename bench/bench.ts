import { bench, run, group, summary } from 'mitata'
import { XMLParser } from 'fast-xml-parser'
import { createXmlJsonParser } from '../examples/xml-json/src/xml-json'

// --- Test data ---

const smallXml = `<?xml version="1.0" encoding="UTF-8"?>
<note>
    <to>User</to>
    <from>Admin</from>
    <heading>Reminder</heading>
    <body>Don't forget the meeting!</body>
</note>`

const mediumXml = `<?xml version="1.0" encoding="UTF-8"?>
<library>
    ${Array.from({ length: 50 }, (_, i) => `
    <book id="${i}" category="${i % 2 === 0 ? 'fiction' : 'non-fiction'}">
        <title>Book Title ${i}</title>
        <author>Author Name ${i}</author>
        <year>${1950 + i}</year>
        <price>${(9.99 + i * 0.5).toFixed(2)}</price>
        <isbn>978-0-${String(i).padStart(4, '0')}-${String(i * 7).padStart(4, '0')}-${i % 10}</isbn>
        <description>This is the description for book number ${i}. It contains &amp; special &lt;characters&gt; and "quotes".</description>
    </book>`).join('\n')}
</library>`

const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Large XML document for benchmarking -->
<catalog xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${Array.from({ length: 200 }, (_, i) => `
    <product id="prod-${i}" sku="SKU-${String(i).padStart(6, '0')}" active="${i % 3 !== 0}">
        <dc:title>Product ${i}</dc:title>
        <dc:description><![CDATA[<p>HTML description for product ${i}</p><ul><li>Feature A</li><li>Feature B</li></ul>]]></dc:description>
        <category>
            <main>Category ${i % 10}</main>
            <sub>Subcategory ${i % 5}</sub>
        </category>
        <pricing currency="USD">
            <retail>${(19.99 + i * 1.5).toFixed(2)}</retail>
            <wholesale>${(9.99 + i * 0.75).toFixed(2)}</wholesale>
            <discount percent="${i % 30}">${((19.99 + i * 1.5) * (1 - (i % 30) / 100)).toFixed(2)}</discount>
        </pricing>
        <specs>
            <weight unit="kg">${(0.5 + i * 0.1).toFixed(1)}</weight>
            <dimensions>
                <width>${10 + i % 50}</width>
                <height>${5 + i % 30}</height>
                <depth>${2 + i % 15}</depth>
            </dimensions>
        </specs>
        <tags>
            <tag>tag-${i % 20}</tag>
            <tag>tag-${(i + 7) % 20}</tag>
            <tag>tag-${(i + 13) % 20}</tag>
        </tags>
        <!-- Product ${i} metadata -->
        <metadata created="2024-01-${String((i % 28) + 1).padStart(2, '0')}" modified="2024-06-${String((i % 28) + 1).padStart(2, '0')}"/>
    </product>`).join('\n')}
</catalog>`

const deeplyNestedXml = `<?xml version="1.0"?>
<level0>
    ${Array.from({ length: 10 }, (_, i) => `
    <level1 id="${i}">
        ${Array.from({ length: 5 }, (_, j) => `
        <level2 id="${i}-${j}">
            ${Array.from({ length: 3 }, (_, k) => `
            <level3 id="${i}-${j}-${k}">
                <level4 attr1="val1" attr2="val2" attr3="val3">
                    <data>Content at ${i}-${j}-${k}</data>
                </level4>
            </level3>`).join('')}
        </level2>`).join('')}
    </level1>`).join('')}
</level0>`

// --- Setup parsers ---

const fxp = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
    cdataPropName: '__cdata',
    commentPropName: '__comment',
})

const parseXmlJson = createXmlJsonParser({
    attributeNamePrefix: '',
    parseAttributeValue: false,
    trimValues: false,
    cdataPropName: '__cdata',
    commentPropName: '__comment',
})

// --- Benchmarks ---

console.log(`\nDocument sizes:`)
console.log(`  Small:  ${smallXml.length} chars`)
console.log(`  Medium: ${mediumXml.length} chars`)
console.log(`  Large:  ${largeXml.length} chars`)
console.log(`  Deep:   ${deeplyNestedXml.length} chars`)
console.log()

summary(() => {
    group('Small XML (~200 chars)', () => {
        bench('@prostojs/parser', () => {
            parseXmlJson(smallXml)
        })
        bench('fast-xml-parser', () => {
            fxp.parse(smallXml)
        })
    })
})

summary(() => {
    group('Medium XML (~5K chars, 50 items)', () => {
        bench('@prostojs/parser', () => {
            parseXmlJson(mediumXml)
        })
        bench('fast-xml-parser', () => {
            fxp.parse(mediumXml)
        })
    })
})

summary(() => {
    group('Large XML (~40K chars, 200 items, CDATA, comments, namespaces)', () => {
        bench('@prostojs/parser', () => {
            parseXmlJson(largeXml)
        })
        bench('fast-xml-parser', () => {
            fxp.parse(largeXml)
        })
    })
})

summary(() => {
    group('Deeply nested XML (4 levels, 150 leaf nodes)', () => {
        bench('@prostojs/parser', () => {
            parseXmlJson(deeplyNestedXml)
        })
        bench('fast-xml-parser', () => {
            fxp.parse(deeplyNestedXml)
        })
    })
})

await run()
