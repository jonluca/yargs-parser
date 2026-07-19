/*
 * This is *only* for bash ANSI-C quoted strings - that is, strings that match the pattern $'some text'
 *
 * It's a fairly rare case but leads to the occasional bug (most notably when copying from Chrome or Firefox devtools).
 * Implementing the escaped string replacement will most likely fix the vast majority of these bugs.
 *
 * Additional documentation
 * https://www.gnu.org/software/bash/manual/bash.html#ANSI_002dC-Quoting
 *
 * Original issue report: https://github.com/NickCarneiro/curlconverter/issues/207
 */
export function escapeAnsiString (str: string): string {
  const escapes: Record<string, string> = {
    "'": "'",
    '"': '"',
    '?': '?',
    a: '\x07',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    '\\': '\\'
  }

  return str.replace(/\\(['"?\\abfnrtv])/g, (_, char: string) => escapes[char])
}

function expandAnsiCQuotes (str: string): string {
  let result = ''
  let opening: "'" | '"' | null = null

  for (let i = 0; i < str.length;) {
    const char = str.charAt(i)

    if (opening) {
      result += char

      if (opening === '"' && char === '\\' && i + 1 < str.length) {
        result += str.charAt(i + 1)
        i += 2
        continue
      }

      if (char === opening) opening = null
      i++
      continue
    }

    if (char === '"' || char === "'") {
      opening = char
      result += char
      i++
      continue
    }

    if (char !== '$' || str.charAt(i + 1) !== "'") {
      result += char
      i++
      continue
    }

    const segmentStart = i
    let content = ''
    i += 2

    while (i < str.length && str.charAt(i) !== "'") {
      const contentChar = str.charAt(i)
      content += contentChar

      if (contentChar === '\\' && i + 1 < str.length) {
        content += str.charAt(i + 1)
        i += 2
      } else {
        i++
      }
    }

    if (i === str.length) {
      result += str.slice(segmentStart)
      break
    }

    result += escapeAnsiString(content)
    i++
  }

  return result
}

export function escapeAnsiCQuotes (stringArr: string[]): string[] {
  return (stringArr || []).map(str => expandAnsiCQuotes(str || ''))
}

// take an un-split argv string and tokenize it.
export function tokenizeArgString (argString: string | any[]): string[] {
  if (Array.isArray(argString)) {
    return argString.map(e => typeof e !== 'string' ? e + '' : e)
  }

  argString = argString.trim()

  let i = 0
  let prevC: string | null = null
  let c: string | null = null
  let opening: string | null = null
  const args: string[] = []

  for (let ii = 0; ii < argString.length; ii++) {
    prevC = c
    c = argString.charAt(ii)

    // split on spaces unless we're in quotes.
    if (c === ' ' && !opening) {
      if (!(prevC === ' ')) {
        i++
      }
      continue
    }

    // don't split the string if we're in matching
    // opening or closing single and double quotes.
    if (c === opening) {
      opening = null
    } else if ((c === "'" || c === '"') && !opening) {
      opening = c
    }

    if (!args[i]) args[i] = ''
    args[i] += c
  }

  return escapeAnsiCQuotes(args)
}
