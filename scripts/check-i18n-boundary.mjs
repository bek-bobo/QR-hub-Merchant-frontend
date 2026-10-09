import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const engineOwners = new Set(['src/shared/i18n/runtime.ts', 'src/shared/i18n/LocaleProvider.tsx'])
const adapterOwners = new Set([
  ...engineOwners, 'src/shared/i18n/LocaleContext.ts', 'src/shared/i18n/messages.ts',
  'src/shared/i18n/resources.ts', 'src/shared/i18n/useLocale.ts', 'src/shared/i18n/useMessages.ts',
  'src/app/i18n/bootstrap.ts',
  'src/test/locale-fixture.tsx',
])
const internals = new Set(['runtime', 'resources', 'LocaleContext', 'metadata.generated'])

export function checkImports(source, filename, project = root) {
  if (/\.(test|typecheck)\.[cm]?[jt]sx?$/.test(filename)) return []
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
  const failures = []
  function check(specifier, node) {
    const engine = /^(?:i18next|react-i18next)(?:\/|$)/.test(specifier)
    const resolved = specifier.startsWith('@/') ? path.join(project, 'src', specifier.slice(2))
      : specifier.startsWith('.') ? path.resolve(project, path.dirname(filename), specifier) : ''
    const internal = resolved && path.relative(project, resolved).replaceAll('\\', '/').startsWith('src/shared/i18n/')
      && internals.has(path.basename(resolved).replace(/\.(?:ts|tsx|js)$/, ''))
    const catalog = resolved && path.relative(project, resolved).replaceAll('\\', '/').startsWith('src/locales/')
    if ((engine && !engineOwners.has(filename)) || ((internal || catalog) && !adapterOwners.has(filename))) {
      const line = tree.getLineAndCharacterOfPosition(node.getStart()).line + 1
      failures.push(`${filename}:${line}: restricted i18n import ${specifier}; use useMessages/createMessages/useLocale`)
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      check(node.moduleSpecifier.text, node)
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) check(node.moduleReference.expression.text, node)
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0]
      && ts.isStringLiteralLike(node.arguments[0])) check(node.arguments[0].text, node)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return failures
}

export async function checkBoundary(project = root) {
  const failures = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(filename)
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        failures.push(...checkImports(await readFile(filename, 'utf8'), path.relative(project, filename).replaceAll('\\', '/'), project))
      }
    }
  }
  await walk(path.join(project, 'src'))
  if (failures.length) throw new Error(failures.join('\n'))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkBoundary().then(() => console.log('i18n import boundary PASS'))
    .catch((error) => { console.error(error.message); process.exitCode = 1 })
}
