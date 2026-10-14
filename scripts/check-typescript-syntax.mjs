import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const files = []

const collect = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      collect(filename)
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(filename)
    }
  }
}

collect(path.resolve('src'))

let errors = 0

for (const filename of files) {
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  for (const diagnostic of source.parseDiagnostics) {
    const { line, character } = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
    const location = path.relative(process.cwd(), filename)
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    console.error(`${location}:${line + 1}:${character + 1} TS${diagnostic.code}: ${message}`)
    errors += 1
  }
}

if (errors > 0) {
  console.error(`Syntax check failed: ${errors} parser error(s) in ${files.length} source files.`)
  process.exitCode = 1
} else {
  console.log(`Syntax check passed: ${files.length} TypeScript/TSX source files.`)
}
