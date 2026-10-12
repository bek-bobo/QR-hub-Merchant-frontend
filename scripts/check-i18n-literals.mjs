import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const normalize = (value) => value.replaceAll('\\', '/')
const uiProperties = new Set(['label', 'title', 'description', 'placeholder', 'heading', 'caption', 'emptyMessage', 'loadingMessage', 'successMessage', 'errorMessage', 'aria-label', 'aria-description', 'alt'])
const readable = (value) => /[\p{L}]/u.test(value)

// Also follows lazy imports and re-exports. Only a proven import.meta.env.DEV
// ancestor is excluded; filenames never grant a production exemption.
export function isDevOnly(node) {
  function requiresDev(expression) {
    if (ts.isParenthesizedExpression(expression)) return requiresDev(expression.expression)
    if (expression.getText() === 'import.meta.env.DEV') return true
    return ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      && (requiresDev(expression.left) || requiresDev(expression.right))
  }
  for (let current = node; current?.parent; current = current.parent) {
    const parent = current.parent
    if (ts.isIfStatement(parent) && parent.thenStatement === current
      && requiresDev(parent.expression)) return true
  }
  return false
}

export function scanText(source, filename) {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const candidates = []
  function add(node, text, surface) {
    text = text.replace(/\s+/g, ' ').trim()
    if (text && readable(text)) candidates.push({ file: filename, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, surface, text, devOnly: isDevOnly(node) })
  }
  function visit(node) {
    if (ts.isJsxText(node)) add(node, node.text, 'jsx-text')
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const parent = node.parent
      if (ts.isJsxAttribute(parent) && uiProperties.has(parent.name.getText())) add(node, node.text, `attribute:${parent.name.getText()}`)
      else if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) && uiProperties.has(parent.parent.name.getText())) add(node, node.text, `attribute:${parent.parent.name.getText()}`)
      else if (ts.isJsxExpression(parent) && (ts.isJsxElement(parent.parent) || ts.isJsxFragment(parent.parent))) add(node, node.text, 'jsx-expression')
      else if (ts.isPropertyAssignment(parent) && uiProperties.has(parent.name.getText().replace(/['"]/g, ''))) add(node, node.text, `property:${parent.name.getText()}`)
      else {
        let ancestor = parent
        while (ancestor && !ts.isJsxExpression(ancestor) && !ts.isCallExpression(ancestor) && !ts.isStatement(ancestor)) {
          if (ts.isJsxAttribute(ancestor) || ts.isJsxElement(ancestor) || ts.isJsxOpeningElement(ancestor) || ts.isPropertyAssignment(ancestor)) break
          if (ts.isBinaryExpression(ancestor) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(ancestor.operatorToken.kind)) break
          ancestor = ancestor.parent
        }
        if (ancestor && ts.isJsxExpression(ancestor) && ts.isJsxAttribute(ancestor.parent) && uiProperties.has(ancestor.parent.name.getText())) add(node, node.text, `attribute:${ancestor.parent.name.getText()}`)
        else if (ancestor && ts.isJsxExpression(ancestor) && (ts.isJsxElement(ancestor.parent) || ts.isJsxFragment(ancestor.parent))) add(node, node.text, 'jsx-expression')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return candidates
}

export function inventory(project = root) {
  const files = new Map()
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !/\.(test|typecheck)\.|\.d\.ts$/.test(entry.name)) files.set(normalize(path.relative(project, full)), fs.readFileSync(full, 'utf8'))
    }
  }
  walk(path.join(project, 'src'))
  const edges = new Map(), unresolved = []
  for (const [file, source] of files) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const imports = []
    function visit(node) {
      let specifier
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) specifier = node.moduleSpecifier.text
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(node.arguments[0]) && !isDevOnly(node)) specifier = node.arguments[0].text
      if (specifier && (specifier.startsWith('@/') || specifier.startsWith('.'))) {
        const base = specifier.startsWith('@/') ? 'src/' + specifier.slice(2) : normalize(path.posix.join(path.posix.dirname(file), specifier))
        const resolved = [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx'].find((value) => files.has(value))
        if (resolved) imports.push(resolved)
        else if (!/\.(css|json|svg|png)$/.test(base)) unresolved.push({ file, specifier })
      }
      ts.forEachChild(node, visit)
    }
    visit(tree); edges.set(file, imports)
  }
  const reachable = new Set()
  function trace(file) { if (reachable.has(file)) return; reachable.add(file); for (const child of edges.get(file) ?? []) trace(child) }
  trace('src/main.tsx')
  const literals = []
  for (const [file, source] of files) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) literals.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: node.text, production: reachable.has(file) && !isDevOnly(node) })
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return { files: [...files.keys()], productionFiles: [...reachable].sort(), unresolved, literals, candidates: [...files].flatMap(([file, source]) => scanText(source, file).map((candidate) => ({ ...candidate, production: reachable.has(file) && !candidate.devOnly }))) }
}

export function checkLiterals(result, exceptions) {
  const failures = [], used = new Set()
  for (const candidate of result.candidates.filter((item) => item.production)) {
    const match = exceptions.findIndex((item) => item.file === candidate.file && item.surface === candidate.surface && item.text === candidate.text && item.reason?.trim() && item.owner?.trim())
    if (match < 0) failures.push(`${candidate.file}:${candidate.line} ${candidate.surface}: ${candidate.text}`)
    else used.add(match)
  }
  exceptions.forEach((item, index) => { if (!used.has(index)) failures.push(`Stale literal exception: ${item.file}: ${item.text}`) })
  return failures
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inventory()
  if (process.argv.includes('--inventory')) {
    fs.writeFileSync(path.join(root, 'docs/i18n/i18n6-evidence/text-inventory.json'), JSON.stringify(result, null, 2) + '\n')
    console.log(`${result.productionFiles.length} production modules; ${result.files.length} total modules; ${result.candidates.length} text candidates; ${result.candidates.filter((item) => item.production).length} production candidates`)
  } else {
    const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-literal-exceptions.json'), 'utf8'))
    const failures = checkLiterals(result, exceptions)
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
    else console.log(`i18n literal check PASS: ${result.productionFiles.length} reachable modules, exact reviewed exceptions only`)
  }
}
