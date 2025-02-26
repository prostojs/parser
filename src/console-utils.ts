export interface TCodeFragmentOptions {
    row?: number
    rowEnd?: number
    limit?: number
    offset?: number
    error?: number
    errorEnd?: number
}

export function renderCodeFragment(lines: string[], options: TCodeFragmentOptions) {
    const row = (options.row || 1) - 1
    const rowEnd = options.rowEnd ? options.rowEnd - 1 : -1
    const limit = Math.min(options.limit || 6, lines.length)
    const offset = Math.min(options.offset || 3, lines.length)
    const error = options.error
    const errorEnd = options.errorEnd
    let output = ''
    const delta = rowEnd - row
    const maxIndex = lines.length
    if (delta > limit ) {
        let longestLine = 0
        const newLimit = Math.floor(limit / 2)
        for (let i = 0; i < newLimit + offset; i++) {
            const index = row + i - offset
            const line = lines[index] || ''
            longestLine = Math.max(line.length, longestLine)
            output += renderLine(line, index < maxIndex ? index + 1 : '', index === row ? error : undefined, index === row || index === rowEnd ? 'bold' : '')
        }
        let output2 = ''
        for (let i = newLimit + offset; i > 0; i--) {
            const index = rowEnd - i + offset
            const line = lines[index] || ''
            longestLine = Math.max(line.length, longestLine)
            output2 += renderLine(line, index < maxIndex ? index + 1 : '', index === rowEnd ? errorEnd : undefined, index === row || index === rowEnd ? 'bold' : '')
        }
        output += renderLine('—'.repeat(longestLine), '———', undefined, 'dim') + output2
    } else {
        for (let i = 0; i < limit + offset; i++) {
            const index = row + i - offset
            if (index <= lines.length + 1) {
                const errorCol = index === row ? error : index === rowEnd ? errorEnd : undefined
                output += renderLine(lines[index], index < maxIndex ? index + 1 : '', errorCol, index === row || index === rowEnd ? 'bold' : '')
            }
        }
    }
    return output           
}

function lineStyles(s: string) {
    return __DYE_BLUE_BRIGHT__ + (s || '')
        .replace(/([a-z_]+)/ig, __DYE_GREEN__ + '$1' + '\x1b[39;33m') 
        .replace(/([\=\.\/'"`\:\+]+)/ig, __DYE_CYAN__ + '$1' + __DYE_COLOR_OFF__)
}
function lineStylesError(s: string) {
    return __DYE_RED__ + (s || '') + __DYE_RESET__
}

function renderLine(line: string, index: number | string, error?: number, style: 'bold' | 'dim' | '' = '') {
    const st = (style === 'bold' ? __DYE_BOLD__ : '') + (style === 'dim' ? __DYE_DIM__ : '')
    if (typeof error === 'number') {
        const errorLength = (/[\.-\s\(\)\*\/\+\{\}\[\]\?\'\"\`\<\>]/.exec(line.slice(error + 1)) || { index: line.length - error }).index + 1
        return renderLineNumber(index, true) +
                st +
               lineStyles(line.slice(0, error)) +
               lineStylesError(line.slice(error, error + errorLength)) +
               lineStyles(line.slice(error + errorLength)) +
               renderLineNumber('', true) + ' '.repeat(error) + __DYE_RED__ + __DYE_BOLD__ + '~'.repeat(Math.max(1, errorLength))
    }
    return renderLineNumber(index, undefined, style === 'bold') + st + lineStyles(line)
}

function renderLineNumber (i?: number | string, isError = false, bold = false) {
    let s = '      '
    const sep = i === '———'
    if (i && Number(i) > 0 || typeof i === 'string') {
        s = '      ' + String(i)
    }
    s = s.slice(s.length - 5)
    return '\n' + __DYE_RESET__ + (sep ? __DYE_BLUE__ : '') +
        (isError ? __DYE_RED__ + __DYE_BOLD__ : (bold ? __DYE_BOLD__ : __DYE_DIM__)) +
        s + (sep ? i : ' | ') + __DYE_RESET__
}
