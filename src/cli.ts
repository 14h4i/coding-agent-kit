import { spawnSync } from "child_process"
import {
  existsSync, mkdirSync, copyFileSync,
  readdirSync, statSync, readFileSync, writeFileSync, rmSync
} from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { homedir, platform } from "os"
import { createInterface } from "readline"
import chalk from "chalk"
import ora from "ora"

const __dirname = dirname(fileURLToPath(import.meta.url))
const KIT_DIR = join(__dirname, "../kit")
const PLATFORMS_DIR = join(KIT_DIR, "platforms")
const SHARED_DIR = join(KIT_DIR, "shared")
const OPENCODE_DIR = join(PLATFORMS_DIR, "opencode")
const CODEX_DIR = join(PLATFORMS_DIR, "codex")
const ANTIGRAVITY_DIR = join(PLATFORMS_DIR, "antigravity")
const CLAUDE_DIR = join(PLATFORMS_DIR, "claude")
const OVERLAYS_DIR = join(SHARED_DIR, "overlays")

const CLI_NAME = "coding-agent-kit"
const PLUGIN_NAME = "coding-agent-kit"

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode")
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex")
const CODEX_AGENTS_DIR = join(homedir(), ".agents")
const CODEX_SKILLS_DIR = join(CODEX_AGENTS_DIR, "skills")
const CODEX_PLUGIN_DEST = join(homedir(), "plugins", PLUGIN_NAME)
const CODEX_MARKETPLACE_PATH = join(CODEX_AGENTS_DIR, "plugins", "marketplace.json")
const ANTIGRAVITY_CONFIG_DIR = join(homedir(), ".gemini", "config")
const ANTIGRAVITY_APP_DATA_DIR = join(homedir(), ".gemini", "antigravity")
const ANTIGRAVITY_CLI_DIR = join(homedir(), ".gemini", "antigravity-cli")
const ANTIGRAVITY_APP_PLUGIN_DEST = join(ANTIGRAVITY_CONFIG_DIR, "plugins", PLUGIN_NAME)
const ANTIGRAVITY_CLI_PLUGIN_DEST = join(ANTIGRAVITY_CLI_DIR, "plugins", PLUGIN_NAME)
const CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude")
const CLAUDE_GLOBAL_INSTRUCTIONS_PATH = join(CLAUDE_CONFIG_DIR, "CLAUDE.md")
const CLAUDE_PLUGIN_DEST = join(CLAUDE_CONFIG_DIR, "skills", PLUGIN_NAME)

const SUPPORTED_LANGS = ["en", "vi", "ja", "ko", "zh", "es", "fr", "de"] as const
type Lang = typeof SUPPORTED_LANGS[number]

const TARGETS = ["opencode", "codex", "antigravity", "claude"] as const
type Target = typeof TARGETS[number]

type CommandOptions = {
  target?: Target
  lang?: string
  dryRun: boolean
  force: boolean
}

type AgentsAction = "created" | "updated" | "appended" | "overwritten"

type AgentsPlan = {
  path: string
  action: AgentsAction
  block: string
  content: string
  existingBlock: { start: number; end: number } | null
}

type StatusItem = {
  label: string
  ok: boolean
  version?: string | null
  stale?: boolean
  note?: string
}

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ja: "日本語",
  ko: "한국어",
  zh: "中文（简体）",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
}

const COMMUNICATION_START = "<!-- COMMUNICATION_START -->"
const COMMUNICATION_END = "<!-- COMMUNICATION_END -->"
const MANAGED_END = "<!-- CODING_AGENT_KIT_END -->"
const CODEX_MANAGED_START_PREFIX = "<!-- CODING_AGENT_KIT_START target=codex"
const OPENCODE_MANAGED_START_PREFIX = "<!-- CODING_AGENT_KIT_START target=opencode"
const CLAUDE_MANAGED_START_PREFIX = "<!-- CODING_AGENT_KIT_START target=claude"
const CODEX_MANAGED_END = MANAGED_END
const CODEX_SKILL_MARKER = "CODING_AGENT_KIT_MANAGED"
const OPENCODE_SKILL_MARKER = "CODING_AGENT_KIT_MANAGED"
const OPENCODE_COMMAND_MARKER = "CODING_AGENT_KIT_MANAGED"
const NPM_LATEST_CACHE_PATH = join(homedir(), ".cache", CLI_NAME, "npm-latest.json")
const NPM_LATEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000

// ─── Helpers ─────────────────────────────────────────────────────────────────

let readline: ReturnType<typeof createInterface> | null = null

function getReadline(): ReturnType<typeof createInterface> {
  if (!readline) {
    readline = createInterface({ input: process.stdin, output: process.stdout })
  }
  return readline
}

function closeReadline() {
  if (!readline) return
  readline.close()
  readline = null
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    getReadline().question(question, (answer) => resolve(answer.trim()))
  })
}

async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const hint = defaultYes ? "(Y/n)" : "(y/N)"
  const answer = await ask(`${question} ${hint} `)
  if (answer === "") return defaultYes
  return answer.toLowerCase() === "y"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"))
}

function writeJsonFile(path: string, value: unknown, dryRun = false) {
  if (dryRun) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

function getPackageVersion(): string {
  try {
    const pkg = readJsonFile(join(__dirname, "../package.json"))
    return isRecord(pkg) && typeof pkg.version === "string" ? pkg.version : "unknown"
  } catch {
    return "unknown"
  }
}

function parseVersion(value: string | null | undefined): number[] | null {
  if (!value || value === "unknown") return null
  const main = value.split(/[+-]/, 1)[0]
  const parts = main.split(".").map(part => Number(part))
  if (parts.length === 0 || parts.some(part => !Number.isInteger(part) || part < 0)) return null
  while (parts.length < 3) parts.push(0)
  return parts.slice(0, 3)
}

function compareVersions(a: string | null | undefined, b: string | null | undefined): number | null {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) return null

  for (let i = 0; i < 3; i += 1) {
    if (left[i] < right[i]) return -1
    if (left[i] > right[i]) return 1
  }
  return 0
}

function isStaleVersion(installed: string | null | undefined): boolean {
  const current = getPackageVersion()
  if (!installed) return true
  return compareVersions(installed, current) === -1
}

function extractVersion(text: string): string | null {
  const match = text.match(/version=([0-9]+(?:\.[0-9]+){0,2}(?:[-+][A-Za-z0-9.-]+)?)/)
  return match?.[1] ?? null
}

function findManagedBlock(content: string, startPrefix: string): { start: number; end: number } | null {
  const start = content.indexOf(startPrefix)
  if (start === -1) return null
  const end = content.indexOf(MANAGED_END, start)
  if (end === -1) return null
  return { start, end: end + MANAGED_END.length }
}

function getManagedBlockVersion(content: string, startPrefix: string): string | null {
  const block = findManagedBlock(content, startPrefix)
  if (!block) return null
  const startLineEnd = content.indexOf("\n", block.start)
  const startLine = content.slice(block.start, startLineEnd === -1 ? block.end : startLineEnd)
  return extractVersion(startLine)
}

function getManagedFileVersion(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    return extractVersion(readFileSync(path, "utf-8"))
  } catch {
    return null
  }
}

function safeRemovePath(path: string, dryRun = false): boolean {
  if (!existsSync(path)) return false
  if (!dryRun) rmSync(path, { recursive: true, force: true })
  return true
}

function removeManagedBlockFromContent(
  content: string,
  block: { start: number; end: number }
): string {
  const before = content.slice(0, block.start).replace(/\n{0,2}$/, "")
  const after = content.slice(block.end).replace(/^\n{0,2}/, "")
  const next = before && after ? `${before}\n\n${after}` : `${before}${after}`
  return next.trim() === "" ? "" : next.endsWith("\n") ? next : `${next}\n`
}

function removeManagedBlockFromFile(
  path: string,
  startPrefix: string,
  dryRun = false
): "removed" | "updated" | "missing" {
  if (!existsSync(path)) return "missing"
  const content = readFileSync(path, "utf-8")
  const block = findManagedBlock(content, startPrefix)
  if (!block) return "missing"
  const next = removeManagedBlockFromContent(content, block)
  if (next.trim() === "") {
    if (!dryRun) rmSync(path, { force: true })
    return "removed"
  }
  writeTextFile(path, next, dryRun)
  return "updated"
}

function getCacheAgeMs(path: string): number | null {
  try {
    return Date.now() - statSync(path).mtimeMs
  } catch {
    return null
  }
}

async function getLatestNpmVersion(): Promise<string | null> {
  const cacheAge = existsSync(NPM_LATEST_CACHE_PATH) ? getCacheAgeMs(NPM_LATEST_CACHE_PATH) : null
  if (cacheAge !== null && cacheAge < NPM_LATEST_CACHE_TTL_MS) {
    try {
      const cached = readJsonFile(NPM_LATEST_CACHE_PATH)
      if (isRecord(cached) && typeof cached.version === "string") return cached.version
    } catch {
      // Ignore corrupt cache and try the registry.
    }
  }

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), 1500)
    const response = await fetch(`https://registry.npmjs.org/${CLI_NAME}/latest`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (!isRecord(body) || typeof body.version !== "string") return null
    try {
      writeJsonFile(NPM_LATEST_CACHE_PATH, { version: body.version, checkedAt: new Date().toISOString() })
    } catch {
      // Cache writes are best-effort; status should still show the fetched version.
    }
    return body.version
  } catch {
    return null
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function copyDir(src: string, dest: string, overwrite = false, dryRun = false): string[] {
  const copied: string[] = []
  if (!dryRun && !existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copied.push(...copyDir(srcPath, destPath, overwrite, dryRun))
    } else if (!existsSync(destPath) || overwrite) {
      if (!dryRun) {
        mkdirSync(dirname(destPath), { recursive: true })
        copyFileSync(srcPath, destPath)
      }
      copied.push(destPath)
    }
  }
  return copied
}

function copyDirTransformed(
  src: string,
  dest: string,
  overwrite = false,
  dryRun = false,
  transform: (relativePath: string, content: string) => string = (_relativePath, content) => content,
  base = src
): string[] {
  const copied: string[] = []
  if (!dryRun && !existsSync(dest)) mkdirSync(dest, { recursive: true })

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copied.push(...copyDirTransformed(srcPath, destPath, overwrite, dryRun, transform, base))
      continue
    }

    if (existsSync(destPath) && !overwrite) continue

    const relativePath = srcPath.slice(base.length + 1).replace(/\\/g, "/")
    const content = transform(relativePath, readFileSync(srcPath, "utf-8"))
    if (!dryRun) {
      mkdirSync(dirname(destPath), { recursive: true })
      writeFileSync(destPath, content)
    }
    copied.push(destPath)
  }

  return copied
}

function listDirNames(path: string): string[] {
  if (!existsSync(path)) return []
  return readdirSync(path)
    .filter(name => statSync(join(path, name)).isDirectory())
    .sort()
}

function listFileNames(path: string, suffix = ""): string[] {
  if (!existsSync(path)) return []
  return readdirSync(path)
    .filter(name => statSync(join(path, name)).isFile())
    .filter(name => suffix === "" || name.endsWith(suffix))
    .sort()
}

function mergeJson(destPath: string, srcPath: string, dryRun = false) {
  const src = readJsonFile(srcPath)
  const dest = existsSync(destPath) ? readJsonFile(destPath) : {}
  if (!isRecord(src) || !isRecord(dest)) {
    throw new Error(`Cannot merge non-object JSON: ${destPath}`)
  }
  writeJsonFile(destPath, deepMerge(dest, src), dryRun)
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key]
    if (isRecord(sourceValue) && isRecord(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else if (!(key in target)) {
      result[key] = sourceValue
    }
  }
  return result
}

function writeTextFile(path: string, content: string, dryRun = false) {
  if (dryRun) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  const value = process.argv[idx + 1]
  return value && !value.startsWith("--") ? value : undefined
}

function getTargetArg(): Target | undefined {
  const value = getArgValue("--target")
  if (!value) return undefined
  if (value === "all") {
    console.log(chalk.red("Target 'all' is not supported. Install one platform at a time."))
    process.exit(1)
  }
  if ((TARGETS as readonly string[]).includes(value)) return value as Target
  console.log(chalk.red(`Unsupported target: ${value}`))
  console.log(`Use one of: ${TARGETS.join(", ")}`)
  process.exit(1)
}

function getLangArg(cmd?: string): string | undefined {
  const flagValue = getArgValue("--lang")
  if (flagValue) return flagValue
  if (cmd === "lang") {
    const value = process.argv[3]
    return value && !value.startsWith("--") ? value : undefined
  }
  return undefined
}

function getOptions(cmd?: string): CommandOptions {
  return {
    target: getTargetArg(),
    lang: getLangArg(cmd),
    dryRun: hasFlag("--dry-run"),
    force: hasFlag("--force"),
  }
}

async function resolveTarget(argTarget?: Target): Promise<Target> {
  if (argTarget) return argTarget

  console.log("\nSelect target platform:")
  console.log("  1. opencode")
  console.log("  2. Codex")
  console.log("  3. Antigravity")
  console.log("  4. Claude")

  const answer = await ask("> ")
  if (answer === "1" || answer.toLowerCase() === "opencode") return "opencode"
  if (answer === "2" || answer.toLowerCase() === "codex") return "codex"
  if (answer === "3" || answer.toLowerCase() === "antigravity") return "antigravity"
  if (answer === "4" || answer.toLowerCase() === "claude") return "claude"
  return "codex"
}

// ─── Language overlay ────────────────────────────────────────────────────────

function getCommunicationBlock(content: string): { start: number; end: number } | null {
  const start = content.indexOf(COMMUNICATION_START)
  const end = content.indexOf(COMMUNICATION_END)
  if (start === -1 || end === -1 || end < start) return null
  return { start, end: end + COMMUNICATION_END.length }
}

function applyLanguageOverlayToContent(content: string, lang: Lang, baseAgentsPath: string): string {
  const block = getCommunicationBlock(content)
  if (!block) return content

  let replacement: string

  if (lang === "en") {
    const baseContent = readFileSync(baseAgentsPath, "utf-8")
    const baseBlock = getCommunicationBlock(baseContent)
    if (!baseBlock) return content
    replacement = baseContent.slice(baseBlock.start, baseBlock.end)
  } else {
    const overlayPath = join(OVERLAYS_DIR, lang, "communication.md")
    if (!existsSync(overlayPath)) return content
    const overlay = readFileSync(overlayPath, "utf-8").trim()
    replacement = `${COMMUNICATION_START}\n${overlay}\n${COMMUNICATION_END}`
  }

  return content.slice(0, block.start) + replacement + content.slice(block.end)
}

function applyLanguageOverlay(agentsPath: string, lang: Lang, baseAgentsPath: string) {
  const content = readFileSync(agentsPath, "utf-8")
  writeFileSync(agentsPath, applyLanguageOverlayToContent(content, lang, baseAgentsPath))
}

async function resolveLang(argLang?: string): Promise<Lang> {
  if (argLang && (SUPPORTED_LANGS as readonly string[]).includes(argLang)) {
    return argLang as Lang
  }

  if (argLang) {
    console.log(chalk.yellow(`Unsupported language '${argLang}', falling back to selection.`))
  }

  console.log("\nSelect language for the Communication section:")
  SUPPORTED_LANGS.forEach((code, i) => {
    const suffix = code === "en" ? " (default)" : ""
    console.log(`  ${i + 1}. ${LANG_LABELS[code]} [${code}]${suffix}`)
  })

  const answer = await ask("> ")
  const num = parseInt(answer, 10)
  if (!isNaN(num) && num >= 1 && num <= SUPPORTED_LANGS.length) {
    return SUPPORTED_LANGS[num - 1]
  }
  const typed = answer.toLowerCase().trim()
  if ((SUPPORTED_LANGS as readonly string[]).includes(typed)) {
    return typed as Lang
  }
  return "en"
}

function detectLangFromContent(content: string): Lang {
  const block = getCommunicationBlock(content)
  const currentBlock = block ? content.slice(block.start, block.end) : content

  for (const code of SUPPORTED_LANGS) {
    if (code === "en") continue
    const overlayPath = join(OVERLAYS_DIR, code, "communication.md")
    if (!existsSync(overlayPath)) continue
    const overlay = readFileSync(overlayPath, "utf-8").trim()
    const markerLine = overlay.split("\n").find(l => l.startsWith("- ")) ?? overlay
    if (currentBlock.includes(markerLine)) return code
  }

  return "en"
}

// ─── Tool checks ─────────────────────────────────────────────────────────────

function checkTool(command: string): { installed: boolean; version?: string } {
  try {
    const result = spawnSync(command, ["--version"], { encoding: "utf-8" })
    if (result.status === 0) {
      const output = result.stdout.trim() || result.stderr.trim()
      return { installed: true, version: output }
    }
    return { installed: false }
  } catch {
    return { installed: false }
  }
}

function getOpencodeInstallHint(): string {
  const os = platform()
  if (os === "darwin") return [
    "  brew install anomalyco/tap/opencode",
    "  # or",
    "  npm install -g opencode-ai",
  ].join("\n")
  if (os === "linux") return [
    "  curl -fsSL https://opencode.ai/install | bash",
    "  # or",
    "  npm install -g opencode-ai",
  ].join("\n")
  return "  npm install -g opencode-ai"
}

function findCodexIdeExtensions(): string[] {
  const roots = [
    { label: "VS Code extension", path: join(homedir(), ".vscode", "extensions") },
    { label: "VS Code Insiders extension", path: join(homedir(), ".vscode-insiders", "extensions") },
    { label: "Cursor extension", path: join(homedir(), ".cursor", "extensions") },
    { label: "Windsurf extension", path: join(homedir(), ".windsurf", "extensions") },
  ]

  const found: string[] = []

  for (const root of roots) {
    if (!existsSync(root.path)) continue

    let entries: string[]
    try {
      entries = readdirSync(root.path)
    } catch {
      continue
    }

    for (const entry of entries) {
      const entryPath = join(root.path, entry)
      try {
        if (!statSync(entryPath).isDirectory()) continue
      } catch {
        continue
      }

      const entryName = entry.toLowerCase()
      if (entryName.includes("openai") && (entryName.includes("codex") || entryName.includes("chatgpt"))) {
        found.push(root.label)
        break
      }

      const packagePath = join(entryPath, "package.json")
      if (!existsSync(packagePath)) continue

      try {
        const pkg = readJsonFile(packagePath)
        if (!isRecord(pkg)) continue

        const publisher = typeof pkg.publisher === "string" ? pkg.publisher.toLowerCase() : ""
        const name = typeof pkg.name === "string" ? pkg.name.toLowerCase() : ""
        const displayName = typeof pkg.displayName === "string" ? pkg.displayName.toLowerCase() : ""
        const description = typeof pkg.description === "string" ? pkg.description.toLowerCase() : ""
        const metadata = `${publisher} ${name} ${displayName} ${description}`

        if (
          publisher === "openai" &&
          (metadata.includes("codex") || metadata.includes("chatgpt"))
        ) {
          found.push(root.label)
          break
        }
      } catch {
        // Ignore malformed extension manifests during best-effort detection.
      }
    }
  }

  return found
}

function detectCodex(): string[] {
  const detected: string[] = []
  if (checkTool("codex").installed) detected.push("command")

  if (platform() === "darwin") {
    const appPaths = [
      "/Applications/Codex.app",
      join(homedir(), "Applications", "Codex.app"),
    ]
    if (appPaths.some(path => existsSync(path))) detected.push("app")
  }

  detected.push(...findCodexIdeExtensions())

  if (existsSync(CODEX_HOME)) detected.push("config")

  return [...new Set(detected)]
}

function findClaudeIdeExtensions(): string[] {
  const roots = [
    { label: "VS Code extension", path: join(homedir(), ".vscode", "extensions") },
    { label: "VS Code Insiders extension", path: join(homedir(), ".vscode-insiders", "extensions") },
    { label: "Cursor extension", path: join(homedir(), ".cursor", "extensions") },
    { label: "Windsurf extension", path: join(homedir(), ".windsurf", "extensions") },
  ]

  const found: string[] = []

  for (const root of roots) {
    if (!existsSync(root.path)) continue

    let entries: string[]
    try {
      entries = readdirSync(root.path)
    } catch {
      continue
    }

    for (const entry of entries) {
      const entryPath = join(root.path, entry)
      try {
        if (!statSync(entryPath).isDirectory()) continue
      } catch {
        continue
      }

      const entryName = entry.toLowerCase()
      if (entryName.includes("anthropic") && entryName.includes("claude")) {
        found.push(root.label)
        break
      }

      const packagePath = join(entryPath, "package.json")
      if (!existsSync(packagePath)) continue

      try {
        const pkg = readJsonFile(packagePath)
        if (!isRecord(pkg)) continue

        const publisher = typeof pkg.publisher === "string" ? pkg.publisher.toLowerCase() : ""
        const name = typeof pkg.name === "string" ? pkg.name.toLowerCase() : ""
        const displayName = typeof pkg.displayName === "string" ? pkg.displayName.toLowerCase() : ""
        const description = typeof pkg.description === "string" ? pkg.description.toLowerCase() : ""
        const metadata = `${publisher} ${name} ${displayName} ${description}`

        if (
          (publisher.includes("anthropic") || metadata.includes("anthropic")) &&
          metadata.includes("claude")
        ) {
          found.push(root.label)
          break
        }
      } catch {
        // Ignore malformed extension manifests during best-effort detection.
      }
    }
  }

  return found
}

function detectClaude(): string[] {
  const detected: string[] = []
  if (checkTool("claude").installed) detected.push("command")

  if (platform() === "darwin") {
    const appPaths = [
      "/Applications/Claude.app",
      "/Applications/Claude Code.app",
      join(homedir(), "Applications", "Claude.app"),
      join(homedir(), "Applications", "Claude Code.app"),
    ]
    if (appPaths.some(path => existsSync(path))) detected.push("app")
  }

  detected.push(...findClaudeIdeExtensions())

  if (existsSync(CLAUDE_CONFIG_DIR)) detected.push("config")

  return [...new Set(detected)]
}

function detectAntigravity(): string[] {
  const detected: string[] = []
  if (checkTool("agy").installed) detected.push("agy command")

  if (platform() === "darwin") {
    const appPaths = [
      "/Applications/Antigravity.app",
      "/Applications/Google Antigravity.app",
      join(homedir(), "Applications", "Antigravity.app"),
      join(homedir(), "Applications", "Google Antigravity.app"),
    ]
    if (appPaths.some(path => existsSync(path))) detected.push("app")
  }

  if (existsSync(ANTIGRAVITY_CONFIG_DIR)) detected.push("global config")
  if (existsSync(ANTIGRAVITY_APP_DATA_DIR)) detected.push("app data")
  if (existsSync(ANTIGRAVITY_CLI_DIR)) detected.push("CLI config")

  return [...new Set(detected)]
}

// ─── Codex managed files ─────────────────────────────────────────────────────

function findCodexManagedBlock(content: string): { start: number; end: number } | null {
  const start = content.indexOf(CODEX_MANAGED_START_PREFIX)
  if (start === -1) return null
  const end = content.indexOf(CODEX_MANAGED_END, start)
  if (end === -1) return null
  return { start, end: end + CODEX_MANAGED_END.length }
}

function codexManagedStart(lang: Lang): string {
  return `<!-- CODING_AGENT_KIT_START target=codex version=${getPackageVersion()} lang=${lang} -->`
}

function buildCodexManagedBlock(lang: Lang): string {
  const base = readFileSync(join(CODEX_DIR, "AGENTS.md"), "utf-8")
  const body = applyLanguageOverlayToContent(base, lang, join(CODEX_DIR, "AGENTS.md")).trim()
  return `${codexManagedStart(lang)}\n${body}\n${CODEX_MANAGED_END}`
}

function countLines(content: string): number {
  if (content.length === 0) return 0
  return content.replace(/\n$/, "").split("\n").length
}

function firstLine(content: string): string {
  return content.split(/\r?\n/, 1)[0] ?? ""
}

function getCodexAgentsPlan(lang: Lang): AgentsPlan {
  const agentsPath = join(CODEX_HOME, "AGENTS.md")
  const block = buildCodexManagedBlock(lang)

  if (!existsSync(agentsPath)) {
    return {
      path: agentsPath,
      action: "created",
      block,
      content: "",
      existingBlock: null,
    }
  }

  const content = readFileSync(agentsPath, "utf-8")
  const existing = findCodexManagedBlock(content)
  return {
    path: agentsPath,
    action: existing ? "updated" : "appended",
    block,
    content,
    existingBlock: existing,
  }
}

function applyCodexAgentsPlan(plan: AgentsPlan, dryRun = false): AgentsAction {
  if (plan.action === "created" || plan.action === "overwritten") {
    writeTextFile(plan.path, `${plan.block}\n`, dryRun)
    return plan.action
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const updated = plan.content.slice(0, plan.existingBlock.start) +
      plan.block +
      plan.content.slice(plan.existingBlock.end)
    writeTextFile(plan.path, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
    return plan.action
  }

  const separator = plan.content.endsWith("\n") ? "\n" : "\n\n"
  writeTextFile(plan.path, `${plan.content}${separator}${plan.block}\n`, dryRun)
  return plan.action
}

function describeCodexAgentsPlan(plan: AgentsPlan) {
  console.log(chalk.bold("\nCodex AGENTS.md:"))
  console.log(`  Path: ${chalk.cyan(plan.path)}`)

  if (plan.action === "created") {
    console.log("  Action: create managed file")
    console.log(`  New block: ${countLines(plan.block)} lines`)
    return
  }

  if (plan.action === "overwritten") {
    console.log(chalk.yellow("  Action: overwrite existing file"))
    console.log(`  Existing content: replaced (${countLines(plan.content)} lines)`)
    console.log(`  New file: managed block only (${countLines(plan.block)} lines)`)
    return
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const oldBlock = plan.content.slice(plan.existingBlock.start, plan.existingBlock.end)
    console.log("  Action: replace existing coding-agent-kit block")
    console.log(`  Old: ${chalk.dim(firstLine(oldBlock))}`)
    console.log(`  New: ${chalk.dim(firstLine(plan.block))}`)
    console.log("  Existing content outside the block will be preserved.")
    return
  }

  const existingLines = countLines(plan.content)
  console.log(existingLines > 0
    ? "  Action: append managed block to existing file"
    : "  Action: add managed block to empty file")
  console.log(`  Existing content: preserved (${existingLines} lines)`)
  console.log(`  New block: appended at the end (${countLines(plan.block)} lines)`)
}

function getCodexAgentsConfirmQuestion(plan: AgentsPlan): string {
  if (plan.action === "overwritten") return "Overwrite existing AGENTS.md and continue?"
  if (plan.action === "updated") return "Replace the existing coding-agent-kit block and continue?"
  if (plan.action === "appended" && plan.content.trim() !== "") {
    return "Append the coding-agent-kit block to existing AGENTS.md and continue?"
  }
  return "Continue?"
}

async function resolveCodexAgentsPlanForWrite(plan: AgentsPlan): Promise<AgentsPlan | null> {
  if (plan.action === "appended" && plan.content.trim() !== "") {
    console.log("\nExisting AGENTS.md has content. Choose an action:")
    console.log(`  ${chalk.cyan("1.")} Append managed block ${chalk.dim("(recommended; preserves existing content)")}`)
    console.log(`  ${chalk.cyan("2.")} Overwrite AGENTS.md ${chalk.dim("(replaces existing content)")}`)
    console.log(`  ${chalk.cyan("3.")} Cancel`)

    const answer = (await ask("> ")).toLowerCase()
    if (answer === "" || answer === "1" || answer === "a" || answer === "append") return plan
    if (answer === "2" || answer === "o" || answer === "overwrite") {
      const overwritePlan = { ...plan, action: "overwritten" as const }
      describeCodexAgentsPlan(overwritePlan)
      return overwritePlan
    }
    return null
  }

  return await confirm(getCodexAgentsConfirmQuestion(plan), true) ? plan : null
}

function getCodexManagedLang(): Lang | null {
  const agentsPath = join(CODEX_HOME, "AGENTS.md")
  if (!existsSync(agentsPath)) return null
  const content = readFileSync(agentsPath, "utf-8")
  const block = findCodexManagedBlock(content)
  if (!block) return null
  const startLineEnd = content.indexOf("\n", block.start)
  const startLine = content.slice(block.start, startLineEnd === -1 ? block.end : startLineEnd)
  const match = startLine.match(/lang=([a-z]{2})/)
  if (match && (SUPPORTED_LANGS as readonly string[]).includes(match[1])) {
    return match[1] as Lang
  }
  return detectLangFromContent(content.slice(block.start, block.end))
}

function setCodexLang(lang: Lang, dryRun = false): boolean {
  const agentsPath = join(CODEX_HOME, "AGENTS.md")
  if (!existsSync(agentsPath)) return false
  const content = readFileSync(agentsPath, "utf-8")
  const block = findCodexManagedBlock(content)
  if (!block) return false

  const blockContent = content.slice(block.start, block.end)
  const withoutOldStart = blockContent.replace(/^<!-- CODING_AGENT_KIT_START target=codex[^\n]* -->/, codexManagedStart(lang))
  const updatedBlock = applyLanguageOverlayToContent(withoutOldStart, lang, join(CODEX_DIR, "AGENTS.md"))
  const updated = content.slice(0, block.start) + updatedBlock + content.slice(block.end)
  writeTextFile(agentsPath, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
  return true
}

// ─── Claude managed files ────────────────────────────────────────────────────

function findClaudeManagedBlock(content: string): { start: number; end: number } | null {
  return findManagedBlock(content, CLAUDE_MANAGED_START_PREFIX)
}

function claudeManagedStart(lang: Lang): string {
  return `<!-- CODING_AGENT_KIT_START target=claude version=${getPackageVersion()} lang=${lang} -->`
}

function buildClaudeManagedBlock(lang: Lang): string {
  const base = readFileSync(join(CLAUDE_DIR, "CLAUDE.md"), "utf-8")
  const body = applyLanguageOverlayToContent(base, lang, join(CLAUDE_DIR, "CLAUDE.md")).trim()
  return `${claudeManagedStart(lang)}\n${body}\n${MANAGED_END}`
}

function getClaudeAgentsPlan(lang: Lang): AgentsPlan {
  const block = buildClaudeManagedBlock(lang)

  if (!existsSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH)) {
    return {
      path: CLAUDE_GLOBAL_INSTRUCTIONS_PATH,
      action: "created",
      block,
      content: "",
      existingBlock: null,
    }
  }

  const content = readFileSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH, "utf-8")
  const existing = findClaudeManagedBlock(content)
  return {
    path: CLAUDE_GLOBAL_INSTRUCTIONS_PATH,
    action: existing ? "updated" : "appended",
    block,
    content,
    existingBlock: existing,
  }
}

function applyClaudeAgentsPlan(plan: AgentsPlan, dryRun = false): AgentsAction {
  if (plan.action === "created" || plan.action === "overwritten") {
    writeTextFile(plan.path, `${plan.block}\n`, dryRun)
    return plan.action
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const updated = plan.content.slice(0, plan.existingBlock.start) +
      plan.block +
      plan.content.slice(plan.existingBlock.end)
    writeTextFile(plan.path, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
    return plan.action
  }

  const separator = plan.content.endsWith("\n") ? "\n" : "\n\n"
  writeTextFile(plan.path, `${plan.content}${separator}${plan.block}\n`, dryRun)
  return plan.action
}

function describeClaudeAgentsPlan(plan: AgentsPlan) {
  console.log(chalk.bold("\nClaude CLAUDE.md:"))
  console.log(`  Path: ${chalk.cyan(plan.path)}`)

  if (plan.action === "created") {
    console.log("  Action: create managed file")
    console.log(`  New block: ${countLines(plan.block)} lines`)
    return
  }

  if (plan.action === "overwritten") {
    console.log(chalk.yellow("  Action: overwrite existing file"))
    console.log(`  Existing content: replaced (${countLines(plan.content)} lines)`)
    console.log(`  New file: managed block only (${countLines(plan.block)} lines)`)
    return
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const oldBlock = plan.content.slice(plan.existingBlock.start, plan.existingBlock.end)
    console.log("  Action: replace existing coding-agent-kit block")
    console.log(`  Old: ${chalk.dim(firstLine(oldBlock))}`)
    console.log(`  New: ${chalk.dim(firstLine(plan.block))}`)
    console.log("  Existing content outside the block will be preserved.")
    return
  }

  const existingLines = countLines(plan.content)
  console.log(existingLines > 0
    ? "  Action: append managed block to existing file"
    : "  Action: add managed block to empty file")
  console.log(`  Existing content: preserved (${existingLines} lines)`)
  console.log(`  New block: appended at the end (${countLines(plan.block)} lines)`)
}

function getClaudeAgentsConfirmQuestion(plan: AgentsPlan): string {
  if (plan.action === "overwritten") return "Overwrite existing CLAUDE.md and continue?"
  if (plan.action === "updated") return "Replace the existing coding-agent-kit block and continue?"
  if (plan.action === "appended" && plan.content.trim() !== "") {
    return "Append the coding-agent-kit block to existing CLAUDE.md and continue?"
  }
  return "Continue?"
}

async function resolveClaudeAgentsPlanForWrite(plan: AgentsPlan): Promise<AgentsPlan | null> {
  if (plan.action === "appended" && plan.content.trim() !== "") {
    console.log("\nExisting CLAUDE.md has content. Choose an action:")
    console.log(`  ${chalk.cyan("1.")} Append managed block ${chalk.dim("(recommended; preserves existing content)")}`)
    console.log(`  ${chalk.cyan("2.")} Overwrite CLAUDE.md ${chalk.dim("(replaces existing content)")}`)
    console.log(`  ${chalk.cyan("3.")} Cancel`)

    const answer = (await ask("> ")).toLowerCase()
    if (answer === "" || answer === "1" || answer === "a" || answer === "append") return plan
    if (answer === "2" || answer === "o" || answer === "overwrite") {
      const overwritePlan = { ...plan, action: "overwritten" as const }
      describeClaudeAgentsPlan(overwritePlan)
      return overwritePlan
    }
    return null
  }

  return await confirm(getClaudeAgentsConfirmQuestion(plan), true) ? plan : null
}

function getClaudeManagedLang(): Lang | null {
  if (!existsSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH)) return null
  const content = readFileSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH, "utf-8")
  const block = findClaudeManagedBlock(content)
  if (!block) return null
  const startLineEnd = content.indexOf("\n", block.start)
  const startLine = content.slice(block.start, startLineEnd === -1 ? block.end : startLineEnd)
  const match = startLine.match(/lang=([a-z]{2})/)
  if (match && (SUPPORTED_LANGS as readonly string[]).includes(match[1])) {
    return match[1] as Lang
  }
  return detectLangFromContent(content.slice(block.start, block.end))
}

function setClaudeLang(lang: Lang, dryRun = false): boolean {
  if (!existsSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH)) return false
  const content = readFileSync(CLAUDE_GLOBAL_INSTRUCTIONS_PATH, "utf-8")
  const block = findClaudeManagedBlock(content)
  if (!block) return false

  const blockContent = content.slice(block.start, block.end)
  const withoutOldStart = blockContent.replace(/^<!-- CODING_AGENT_KIT_START target=claude[^\n]* -->/, claudeManagedStart(lang))
  const updatedBlock = applyLanguageOverlayToContent(withoutOldStart, lang, join(CLAUDE_DIR, "CLAUDE.md"))
  const updated = content.slice(0, block.start) + updatedBlock + content.slice(block.end)
  writeTextFile(CLAUDE_GLOBAL_INSTRUCTIONS_PATH, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
  return true
}

// ─── opencode managed files ───────────────────────────────────────────────────

function findOpencodeManagedBlock(content: string): { start: number; end: number } | null {
  return findManagedBlock(content, OPENCODE_MANAGED_START_PREFIX)
}

function opencodeManagedStart(lang: Lang): string {
  return `<!-- CODING_AGENT_KIT_START target=opencode version=${getPackageVersion()} lang=${lang} -->`
}

function buildOpencodeManagedBlock(lang: Lang): string {
  const base = readFileSync(join(OPENCODE_DIR, "AGENTS.md"), "utf-8")
  const body = applyLanguageOverlayToContent(base, lang, join(OPENCODE_DIR, "AGENTS.md")).trim()
  return `${opencodeManagedStart(lang)}\n${body}\n${MANAGED_END}`
}

function getOpencodeAgentsPlan(lang: Lang): AgentsPlan {
  const agentsPath = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  const block = buildOpencodeManagedBlock(lang)

  if (!existsSync(agentsPath)) {
    return {
      path: agentsPath,
      action: "created",
      block,
      content: "",
      existingBlock: null,
    }
  }

  const content = readFileSync(agentsPath, "utf-8")
  const existing = findOpencodeManagedBlock(content)
  return {
    path: agentsPath,
    action: existing ? "updated" : "appended",
    block,
    content,
    existingBlock: existing,
  }
}

function applyOpencodeAgentsPlan(plan: AgentsPlan, dryRun = false): AgentsAction {
  if (plan.action === "created" || plan.action === "overwritten") {
    writeTextFile(plan.path, `${plan.block}\n`, dryRun)
    return plan.action
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const updated = plan.content.slice(0, plan.existingBlock.start) +
      plan.block +
      plan.content.slice(plan.existingBlock.end)
    writeTextFile(plan.path, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
    return plan.action
  }

  const separator = plan.content.endsWith("\n") ? "\n" : "\n\n"
  writeTextFile(plan.path, `${plan.content}${separator}${plan.block}\n`, dryRun)
  return plan.action
}

function describeOpencodeAgentsPlan(plan: AgentsPlan) {
  console.log(chalk.bold("\nopencode AGENTS.md:"))
  console.log(`  Path: ${chalk.cyan(plan.path)}`)

  if (plan.action === "created") {
    console.log("  Action: create managed file")
    console.log(`  New block: ${countLines(plan.block)} lines`)
    return
  }

  if (plan.action === "overwritten") {
    console.log(chalk.yellow("  Action: overwrite existing file"))
    console.log(`  Existing content: replaced (${countLines(plan.content)} lines)`)
    console.log(`  New file: managed block only (${countLines(plan.block)} lines)`)
    return
  }

  if (plan.action === "updated" && plan.existingBlock) {
    const oldBlock = plan.content.slice(plan.existingBlock.start, plan.existingBlock.end)
    console.log("  Action: replace existing coding-agent-kit block")
    console.log(`  Old: ${chalk.dim(firstLine(oldBlock))}`)
    console.log(`  New: ${chalk.dim(firstLine(plan.block))}`)
    console.log("  Existing content outside the block will be preserved.")
    return
  }

  const existingLines = countLines(plan.content)
  console.log(existingLines > 0
    ? "  Action: append managed block to existing file"
    : "  Action: add managed block to empty file")
  console.log(`  Existing content: preserved (${existingLines} lines)`)
  console.log(`  New block: appended at the end (${countLines(plan.block)} lines)`)
}

function getOpencodeAgentsConfirmQuestion(plan: AgentsPlan): string {
  if (plan.action === "overwritten") return "Overwrite existing AGENTS.md and continue?"
  if (plan.action === "updated") return "Replace the existing coding-agent-kit block and continue?"
  if (plan.action === "appended" && plan.content.trim() !== "") {
    return "Append the coding-agent-kit block to existing AGENTS.md and continue?"
  }
  return "Continue?"
}

async function resolveOpencodeAgentsPlanForWrite(plan: AgentsPlan): Promise<AgentsPlan | null> {
  if (plan.action === "appended" && plan.content.trim() !== "") {
    console.log("\nExisting AGENTS.md has content. Choose an action:")
    console.log(`  ${chalk.cyan("1.")} Append managed block ${chalk.dim("(recommended; preserves existing content)")}`)
    console.log(`  ${chalk.cyan("2.")} Overwrite AGENTS.md ${chalk.dim("(replaces existing content)")}`)
    console.log(`  ${chalk.cyan("3.")} Cancel`)

    const answer = (await ask("> ")).toLowerCase()
    if (answer === "" || answer === "1" || answer === "a" || answer === "append") return plan
    if (answer === "2" || answer === "o" || answer === "overwrite") {
      const overwritePlan = { ...plan, action: "overwritten" as const }
      describeOpencodeAgentsPlan(overwritePlan)
      return overwritePlan
    }
    return null
  }

  return await confirm(getOpencodeAgentsConfirmQuestion(plan), true) ? plan : null
}

function getOpencodeManagedLang(): Lang | null {
  const agentsPath = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  if (!existsSync(agentsPath)) return null
  const content = readFileSync(agentsPath, "utf-8")
  const block = findOpencodeManagedBlock(content)
  if (!block) return null
  const startLineEnd = content.indexOf("\n", block.start)
  const startLine = content.slice(block.start, startLineEnd === -1 ? block.end : startLineEnd)
  const match = startLine.match(/lang=([a-z]{2})/)
  if (match && (SUPPORTED_LANGS as readonly string[]).includes(match[1])) {
    return match[1] as Lang
  }
  return detectLangFromContent(content.slice(block.start, block.end))
}

function setOpencodeLang(lang: Lang, dryRun = false): boolean {
  const agentsPath = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  if (!existsSync(agentsPath)) return false
  const content = readFileSync(agentsPath, "utf-8")
  const block = findOpencodeManagedBlock(content)
  if (!block) return false

  const blockContent = content.slice(block.start, block.end)
  const withoutOldStart = blockContent.replace(/^<!-- CODING_AGENT_KIT_START target=opencode[^\n]* -->/, opencodeManagedStart(lang))
  const updatedBlock = applyLanguageOverlayToContent(withoutOldStart, lang, join(OPENCODE_DIR, "AGENTS.md"))
  const updated = content.slice(0, block.start) + updatedBlock + content.slice(block.end)
  writeTextFile(agentsPath, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
  return true
}

function copyCodexSkills(overwrite: boolean, dryRun = false): { copied: number; skipped: string[] } {
  const skillsSrc = join(CODEX_DIR, "plugin", "skills")
  const skipped: string[] = []
  let copied = 0

  for (const skillName of readdirSync(skillsSrc)) {
    const srcPath = join(skillsSrc, skillName)
    if (!statSync(srcPath).isDirectory()) continue
    const destPath = join(CODEX_SKILLS_DIR, skillName)
    const destSkillPath = join(destPath, "SKILL.md")
    const canOverwrite = overwrite ||
      !existsSync(destSkillPath) ||
      readFileSync(destSkillPath, "utf-8").includes(CODEX_SKILL_MARKER)

    if (!canOverwrite) {
      skipped.push(skillName)
      continue
    }

    copied += copyDir(srcPath, destPath, true, dryRun).length
  }

  return { copied, skipped }
}

function copyCodexPlugin(dryRun = false): number {
  const pluginSrc = join(CODEX_DIR, "plugin")
  return copyDir(pluginSrc, CODEX_PLUGIN_DEST, true, dryRun).length
}

function isManagedPluginDirectory(dirPath: string, manifestRelativePath: string): boolean {
  const manifestPath = join(dirPath, manifestRelativePath)
  if (!existsSync(manifestPath)) return false
  try {
    const manifest = readJsonFile(manifestPath)
    return isRecord(manifest) && manifest.name === PLUGIN_NAME
  } catch {
    return false
  }
}

function copyManagedPlugin(
  srcPath: string,
  destPath: string,
  manifestRelativePath: string,
  force: boolean,
  dryRun = false,
  transform: (relativePath: string, content: string) => string = (_relativePath, content) => content
): { copied: number; skipped: boolean } {
  if (existsSync(destPath) && !isManagedPluginDirectory(destPath, manifestRelativePath) && !force) {
    return { copied: 0, skipped: true }
  }

  const copied = copyDirTransformed(srcPath, destPath, true, dryRun, transform).length
  return { copied, skipped: false }
}

function copyClaudePlugin(force: boolean, dryRun = false): { copied: number; skipped: boolean } {
  return copyManagedPlugin(
    join(CLAUDE_DIR, "plugin"),
    CLAUDE_PLUGIN_DEST,
    join(".claude-plugin", "plugin.json"),
    force,
    dryRun
  )
}

function antigravityPluginTransform(lang: Lang): (relativePath: string, content: string) => string {
  return (relativePath, content) => {
    if (relativePath !== "rules/coding-agent-kit.md") return content
    const withLang = content.replace(
      /<!-- CODING_AGENT_KIT_MANAGED version=[^ ]+(?: lang=[a-z]{2})? -->/,
      `<!-- CODING_AGENT_KIT_MANAGED version=${getPackageVersion()} lang=${lang} -->`
    )
    return applyLanguageOverlayToContent(withLang, lang, join(ANTIGRAVITY_DIR, "plugin", "rules", "coding-agent-kit.md"))
  }
}

function copyAntigravityPlugin(
  destPath: string,
  lang: Lang,
  force: boolean,
  dryRun = false
): { copied: number; skipped: boolean } {
  return copyManagedPlugin(
    join(ANTIGRAVITY_DIR, "plugin"),
    destPath,
    "plugin.json",
    force,
    dryRun,
    antigravityPluginTransform(lang)
  )
}

type AntigravitySurface = "app" | "cli"

function antigravitySurfacePath(surface: AntigravitySurface): string {
  return surface === "app" ? ANTIGRAVITY_APP_PLUGIN_DEST : ANTIGRAVITY_CLI_PLUGIN_DEST
}

function antigravitySurfaceLabel(surface: AntigravitySurface): string {
  return surface === "app" ? "app/editor plugin" : "CLI plugin"
}

function getInstalledAntigravitySurfaces(): AntigravitySurface[] {
  const surfaces: AntigravitySurface[] = []
  if (isManagedPluginDirectory(ANTIGRAVITY_APP_PLUGIN_DEST, "plugin.json")) surfaces.push("app")
  if (isManagedPluginDirectory(ANTIGRAVITY_CLI_PLUGIN_DEST, "plugin.json")) surfaces.push("cli")
  return surfaces
}

function getAntigravityRulePath(surface: AntigravitySurface): string {
  return join(antigravitySurfacePath(surface), "rules", "coding-agent-kit.md")
}

function getAntigravityManagedLang(): Lang | null {
  for (const surface of getInstalledAntigravitySurfaces()) {
    const rulePath = getAntigravityRulePath(surface)
    if (!existsSync(rulePath)) continue
    const content = readFileSync(rulePath, "utf-8")
    const match = content.match(/lang=([a-z]{2})/)
    if (match && (SUPPORTED_LANGS as readonly string[]).includes(match[1])) {
      return match[1] as Lang
    }
    return detectLangFromContent(content)
  }
  return null
}

function getDefaultAntigravitySurfaces(mode: "install" | "update" | "uninstall" | "lang"): AntigravitySurface[] {
  const installed = getInstalledAntigravitySurfaces()
  if ((mode === "update" || mode === "uninstall" || mode === "lang") && installed.length > 0) {
    return installed
  }

  const detected = detectAntigravity()
  const hasCliSignal = detected.some(signal => signal === "agy command" || signal === "CLI config")
  const hasAppSignal = detected.some(signal => signal === "app" || signal === "global config" || signal === "app data")
  const surfaces: AntigravitySurface[] = []

  if (hasAppSignal || !hasCliSignal) surfaces.push("app")
  if (hasCliSignal) surfaces.push("cli")
  return surfaces.length > 0 ? surfaces : ["app"]
}

async function resolveAntigravitySurfaces(
  mode: "install" | "update" | "uninstall" | "lang",
  dryRun = false
): Promise<AntigravitySurface[]> {
  const defaults = getDefaultAntigravitySurfaces(mode)
  if (dryRun || !process.stdin.isTTY) return defaults

  console.log("\nSelect Antigravity surfaces:")
  const verb = mode === "uninstall" ? "Remove from" : mode === "lang" ? "Update language for" : "Install for"
  const appDefault = defaults.includes("app")
  const cliDefault = defaults.includes("cli")
  const app = await confirm(`${verb} Antigravity app/editor?`, appDefault)
  const cli = await confirm(`${verb} Antigravity CLI?`, cliDefault)
  const selected: AntigravitySurface[] = []
  if (app) selected.push("app")
  if (cli) selected.push("cli")
  return selected
}

function getMarketplaceEntry(): Record<string, unknown> {
  return {
    name: PLUGIN_NAME,
    source: {
      source: "local",
      path: `./plugins/${PLUGIN_NAME}`,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Productivity",
  }
}

function upsertCodexMarketplace(dryRun = false): "created" | "updated" | "unchanged" {
  const entry = getMarketplaceEntry()

  if (!existsSync(CODEX_MARKETPLACE_PATH)) {
    writeJsonFile(CODEX_MARKETPLACE_PATH, {
      name: "personal",
      interface: {
        displayName: "Personal",
      },
      plugins: [entry],
    }, dryRun)
    return "created"
  }

  const marketplace = readJsonFile(CODEX_MARKETPLACE_PATH)
  if (!isRecord(marketplace)) {
    throw new Error(`Cannot update non-object marketplace: ${CODEX_MARKETPLACE_PATH}`)
  }

  const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : []
  const index = plugins.findIndex(plugin => isRecord(plugin) && plugin.name === PLUGIN_NAME)
  if (index === -1) {
    writeJsonFile(CODEX_MARKETPLACE_PATH, { ...marketplace, plugins: [...plugins, entry] }, dryRun)
    return "updated"
  }

  const existing = plugins[index]
  if (JSON.stringify(existing) === JSON.stringify(entry)) return "unchanged"

  const nextPlugins = [...plugins]
  nextPlugins[index] = entry
  writeJsonFile(CODEX_MARKETPLACE_PATH, { ...marketplace, plugins: nextPlugins }, dryRun)
  return "updated"
}

async function maybeAddCodexPluginRecord(dryRun = false) {
  if (dryRun) return

  if (!checkTool("codex").installed) {
    console.log(chalk.dim("  –  plugin record not installed; direct skills are ready, or install the plugin from Codex Plugins"))
    return
  }

  if (!process.stdin.isTTY) {
    console.log(chalk.dim(`  –  plugin record not installed in non-interactive mode; run ${chalk.bold("codex plugin add coding-agent-kit@personal")} later if needed`))
    return
  }

  if (!await confirm("Install or refresh the Codex plugin record now?", true)) {
    console.log(chalk.dim(`  –  plugin record skipped; run ${chalk.bold("codex plugin add coding-agent-kit@personal")} later if needed`))
    return
  }

  const result = spawnSync("codex", ["plugin", "add", `${PLUGIN_NAME}@personal`], {
    encoding: "utf-8",
  })

  if (result.status === 0) {
    console.log(chalk.green("  ✓") + "  plugin record installed/refreshed")
    const output = `${result.stdout}${result.stderr}`.trim()
    if (output) console.log(chalk.dim(output.split("\n").map(line => `     ${line}`).join("\n")))
    return
  }

  console.log(chalk.yellow("  !") + "  plugin record install failed")
  const output = `${result.stderr}${result.stdout}`.trim()
  if (output) console.log(chalk.dim(output.split("\n").map(line => `     ${line}`).join("\n")))
  console.log(chalk.dim(`     You can retry with: codex plugin add ${PLUGIN_NAME}@personal`))
}

// ─── Commands: install ───────────────────────────────────────────────────────

async function cmdInstall(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdInstallOpencode(options)
  if (target === "codex") return cmdInstallCodex(options)
  if (target === "antigravity") return cmdInstallAntigravity(options)
  return cmdInstallClaude(options)
}

async function cmdInstallOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🚀 ${CLI_NAME} — opencode installer\n`))

  const spinner = ora("Checking opencode...").start()
  const { installed, version } = checkTool("opencode")

  if (!installed) {
    spinner.fail(chalk.red("opencode is not installed on this machine."))
    console.log(chalk.yellow("\nInstall opencode first:\n"))
    console.log(getOpencodeInstallHint())
    console.log(chalk.dim("\nThen run again: ") + chalk.cyan(`${CLI_NAME} install --target opencode`))
    process.exit(1)
  }

  spinner.succeed(`opencode is installed ${chalk.dim(version ?? "")}`)

  const lang = await resolveLang(options.lang)
  let agentsPlan = getOpencodeAgentsPlan(lang)
  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log("\nWill install opencode kit into:")
  console.log(`  ${chalk.cyan(join(OPENCODE_CONFIG_DIR, "AGENTS.md"))} (managed block only)`)
  console.log(`  ${chalk.cyan(join(OPENCODE_CONFIG_DIR, "opencode.json"))}`)
  console.log(`  ${chalk.cyan(join(OPENCODE_CONFIG_DIR, "skills"))}`)
  console.log(`  ${chalk.cyan(join(OPENCODE_CONFIG_DIR, "commands"))}\n`)
  describeOpencodeAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveOpencodeAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  if (!options.dryRun) mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true })

  const agentsAction = applyOpencodeAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  AGENTS.md managed block (${agentsAction})`)

  const jsonDest = join(OPENCODE_CONFIG_DIR, "opencode.json")
  const jsonSrc = join(OPENCODE_DIR, "opencode.json")
  if (existsSync(jsonDest)) {
    mergeJson(jsonDest, jsonSrc, options.dryRun)
    console.log(chalk.green("  ✓") + "  opencode.json (merged)")
  } else {
    if (!options.dryRun) copyFileSync(jsonSrc, jsonDest)
    console.log(chalk.green("  ✓") + "  opencode.json")
  }

  const skillsSrc = join(OPENCODE_DIR, "skills")
  if (existsSync(skillsSrc)) {
    console.log("")
    const copied = copyDir(skillsSrc, join(OPENCODE_CONFIG_DIR, "skills"), false, options.dryRun)
    console.log(chalk.green("  ✓") + `  skills/ — ${copied.length} files copied`)
  }

  const cmdsSrc = join(OPENCODE_DIR, "commands")
  if (existsSync(cmdsSrc)) {
    const copied = copyDir(cmdsSrc, join(OPENCODE_CONFIG_DIR, "commands"), false, options.dryRun)
    console.log(chalk.green("  ✓") + `  commands/ — ${copied.length} files copied`)
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Install complete!\n"))
  console.log("Next steps:")
  console.log(`  ${chalk.cyan("1.")} cd into your project`)
  console.log(`  ${chalk.cyan("2.")} Run: ${chalk.bold("opencode")}`)
  console.log(`  ${chalk.cyan("3.")} Type ${chalk.bold("/init-existing")} or ${chalk.bold("/init-new")}\n`)
}

async function cmdInstallCodex(options: CommandOptions) {
  console.log(chalk.bold(`\n🚀 ${CLI_NAME} — Codex installer\n`))

  const codexDetected = detectCodex()
  if (codexDetected.length > 0) {
    console.log(chalk.dim(`Codex detected: ${codexDetected.join(", ")}`))
  } else {
    console.log(chalk.dim("Codex not detected."))
  }

  const lang = await resolveLang(options.lang)
  let agentsPlan = getCodexAgentsPlan(lang)
  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log("\nWill install Codex kit into:")
  console.log(`  ${chalk.cyan(join(CODEX_HOME, "AGENTS.md"))} (managed block only)`)
  console.log(`  ${chalk.cyan(CODEX_SKILLS_DIR)}`)
  console.log(`  ${chalk.cyan(CODEX_PLUGIN_DEST)}`)
  console.log(`  ${chalk.cyan(CODEX_MARKETPLACE_PATH)}\n`)
  describeCodexAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveCodexAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  const agentsAction = applyCodexAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  AGENTS.md managed block (${agentsAction})`)

  const skills = copyCodexSkills(options.force, options.dryRun)
  console.log(chalk.green("  ✓") + `  skills/ — ${skills.copied} files copied`)
  for (const skill of skills.skipped) {
    console.log(chalk.yellow("  !") + `  skills/${skill} skipped (existing custom skill; use --force to overwrite)`)
  }

  const pluginFiles = copyCodexPlugin(options.dryRun)
  console.log(chalk.green("  ✓") + `  plugin — ${pluginFiles} files copied`)

  const marketplaceAction = upsertCodexMarketplace(options.dryRun)
  console.log(chalk.green("  ✓") + `  marketplace (${marketplaceAction})`)
  await maybeAddCodexPluginRecord(options.dryRun)

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Install complete!\n"))
  console.log("Next steps:")
  console.log(`  ${chalk.cyan("1.")} Restart Codex or start a new Codex session`)
  console.log(`  ${chalk.cyan("2.")} Use ${chalk.bold("$coding-agent-scan-project")} to initialize an existing project`)
  console.log(`  ${chalk.cyan("3.")} If the plugin record was skipped, enable it from Codex Plugins when needed\n`)
}

async function cmdInstallAntigravity(options: CommandOptions) {
  console.log(chalk.bold(`\n🚀 ${CLI_NAME} — Antigravity installer\n`))

  const detected = detectAntigravity()
  if (detected.length > 0) {
    console.log(chalk.dim(`Antigravity detected: ${detected.join(", ")}`))
  } else {
    console.log(chalk.dim("Antigravity not detected."))
  }

  const lang = await resolveLang(options.lang)
  const surfaces = await resolveAntigravitySurfaces("install", options.dryRun)
  if (surfaces.length === 0) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log("\nWill install Antigravity plugin into:")
  for (const surface of surfaces) {
    console.log(`  ${chalk.cyan(antigravitySurfacePath(surface))} (${antigravitySurfaceLabel(surface)})`)
  }
  console.log("")

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  }

  for (const surface of surfaces) {
    const result = copyAntigravityPlugin(antigravitySurfacePath(surface), lang, options.force, options.dryRun)
    if (result.skipped) {
      console.log(chalk.yellow("  !") + `  ${antigravitySurfaceLabel(surface)} skipped (existing directory is not a coding-agent-kit plugin; use --force to overwrite)`)
    } else {
      console.log(chalk.green("  ✓") + `  ${antigravitySurfaceLabel(surface)} — ${result.copied} files copied`)
    }
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Install complete!\n"))
  console.log("Next steps:")
  console.log(`  ${chalk.cyan("1.")} Restart Antigravity or start a new session`)
  console.log(`  ${chalk.cyan("2.")} Use the ${chalk.bold("scan-project")} skill to initialize an existing project\n`)
}

async function cmdInstallClaude(options: CommandOptions) {
  console.log(chalk.bold(`\n🚀 ${CLI_NAME} — Claude installer\n`))

  const detected = detectClaude()
  if (detected.length > 0) {
    console.log(chalk.dim(`Claude detected: ${detected.join(", ")}`))
  } else {
    console.log(chalk.dim("Claude not detected."))
  }

  const lang = await resolveLang(options.lang)
  let agentsPlan = getClaudeAgentsPlan(lang)
  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log("\nWill install Claude kit into:")
  console.log(`  ${chalk.cyan(CLAUDE_GLOBAL_INSTRUCTIONS_PATH)} (managed block only)`)
  console.log(`  ${chalk.cyan(CLAUDE_PLUGIN_DEST)}\n`)
  describeClaudeAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveClaudeAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  const agentsAction = applyClaudeAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  CLAUDE.md managed block (${agentsAction})`)

  const plugin = copyClaudePlugin(options.force, options.dryRun)
  if (plugin.skipped) {
    console.log(chalk.yellow("  !") + "  plugin skipped (existing directory is not a coding-agent-kit plugin; use --force to overwrite)")
  } else {
    console.log(chalk.green("  ✓") + `  plugin — ${plugin.copied} files copied`)
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Install complete!\n"))
  console.log("Next steps:")
  console.log(`  ${chalk.cyan("1.")} Restart Claude Code or start a new Claude session`)
  console.log(`  ${chalk.cyan("2.")} Use ${chalk.bold("/coding-agent-kit:scan-project")} to initialize an existing project\n`)
}

// ─── Commands: update ────────────────────────────────────────────────────────

async function cmdUpdate(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdUpdateOpencode(options)
  if (target === "codex") return cmdUpdateCodex(options)
  if (target === "antigravity") return cmdUpdateAntigravity(options)
  return cmdUpdateClaude(options)
}

async function cmdUpdateOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — opencode update\n`))

  if (!checkTool("opencode").installed) {
    console.log(chalk.red(`opencode is not installed. Run ${CLI_NAME} install --target opencode first.`))
    process.exit(1)
  }

  const currentLang = getOpencodeManagedLang()
  const lang = options.lang ? await resolveLang(options.lang) : currentLang ?? "en"
  let agentsPlan = getOpencodeAgentsPlan(lang)
  console.log(`Updating: ${chalk.cyan(OPENCODE_CONFIG_DIR)}\n`)
  console.log(chalk.yellow("This will overwrite kit skills and commands. Existing AGENTS.md content outside the managed block and opencode.json keys are preserved.\n"))
  describeOpencodeAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveOpencodeAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  const agentsAction = applyOpencodeAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  AGENTS.md managed block (${agentsAction})`)

  const s = copyDir(join(OPENCODE_DIR, "skills"), join(OPENCODE_CONFIG_DIR, "skills"), true, options.dryRun)
  console.log(chalk.green("  ✓") + `  skills/ — ${s.length} files updated`)

  const c = copyDir(join(OPENCODE_DIR, "commands"), join(OPENCODE_CONFIG_DIR, "commands"), true, options.dryRun)
  console.log(chalk.green("  ✓") + `  commands/ — ${c.length} files updated`)

  const jsonDest = join(OPENCODE_CONFIG_DIR, "opencode.json")
  if (existsSync(jsonDest)) {
    mergeJson(jsonDest, join(OPENCODE_DIR, "opencode.json"), options.dryRun)
    console.log(chalk.green("  ✓") + "  opencode.json (merged new keys)")
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
}

async function cmdUpdateCodex(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — Codex update\n`))

  const currentLang = getCodexManagedLang()
  const lang = options.lang ? await resolveLang(options.lang) : currentLang ?? "en"
  let agentsPlan = getCodexAgentsPlan(lang)
  describeCodexAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveCodexAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  const agentsAction = applyCodexAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  AGENTS.md managed block (${agentsAction})`)

  const skills = copyCodexSkills(options.force, options.dryRun)
  console.log(chalk.green("  ✓") + `  skills/ — ${skills.copied} files updated`)
  for (const skill of skills.skipped) {
    console.log(chalk.yellow("  !") + `  skills/${skill} skipped (existing custom skill; use --force to overwrite)`)
  }

  const pluginFiles = copyCodexPlugin(options.dryRun)
  console.log(chalk.green("  ✓") + `  plugin — ${pluginFiles} files updated`)

  const marketplaceAction = upsertCodexMarketplace(options.dryRun)
  console.log(chalk.green("  ✓") + `  marketplace (${marketplaceAction})`)
  await maybeAddCodexPluginRecord(options.dryRun)

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
}

async function cmdUpdateAntigravity(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — Antigravity update\n`))

  const currentLang = getAntigravityManagedLang()
  const lang = options.lang ? await resolveLang(options.lang) : currentLang ?? "en"
  const surfaces = await resolveAntigravitySurfaces("update", options.dryRun)
  if (surfaces.length === 0) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  console.log(chalk.dim(`Language: ${LANG_LABELS[lang]}`))
  console.log(chalk.yellow("This will overwrite coding-agent-kit Antigravity plugin files only. Hooks, sidecars, MCP, settings, and permissions are not changed.\n"))

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  }

  for (const surface of surfaces) {
    const result = copyAntigravityPlugin(antigravitySurfacePath(surface), lang, options.force, options.dryRun)
    if (result.skipped) {
      console.log(chalk.yellow("  !") + `  ${antigravitySurfaceLabel(surface)} skipped (existing directory is not a coding-agent-kit plugin; use --force to overwrite)`)
    } else {
      console.log(chalk.green("  ✓") + `  ${antigravitySurfaceLabel(surface)} — ${result.copied} files updated`)
    }
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
}

async function cmdUpdateClaude(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — Claude update\n`))

  const currentLang = getClaudeManagedLang()
  const lang = options.lang ? await resolveLang(options.lang) : currentLang ?? "en"
  let agentsPlan = getClaudeAgentsPlan(lang)
  describeClaudeAgentsPlan(agentsPlan)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else {
    const selectedPlan = await resolveClaudeAgentsPlanForWrite(agentsPlan)
    if (!selectedPlan) {
      console.log(chalk.dim("Cancelled."))
      process.exit(0)
    }
    agentsPlan = selectedPlan
  }

  const agentsAction = applyClaudeAgentsPlan(agentsPlan, options.dryRun)
  console.log(chalk.green("  ✓") + `  CLAUDE.md managed block (${agentsAction})`)

  const plugin = copyClaudePlugin(options.force, options.dryRun)
  if (plugin.skipped) {
    console.log(chalk.yellow("  !") + "  plugin skipped (existing directory is not a coding-agent-kit plugin; use --force to overwrite)")
  } else {
    console.log(chalk.green("  ✓") + `  plugin — ${plugin.copied} files updated`)
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
}

// ─── Commands: uninstall ─────────────────────────────────────────────────────

type RemoveResult = "removed" | "updated" | "missing" | "skipped"

async function cmdUninstall(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdUninstallOpencode(options)
  if (target === "codex") return cmdUninstallCodex(options)
  if (target === "antigravity") return cmdUninstallAntigravity(options)
  return cmdUninstallClaude(options)
}

function printRemoveResult(label: string, result: RemoveResult) {
  if (result === "removed") {
    console.log(chalk.green("  ✓") + `  ${label} removed`)
    return
  }
  if (result === "updated") {
    console.log(chalk.green("  ✓") + `  ${label} managed block removed`)
    return
  }
  if (result === "skipped") {
    console.log(chalk.yellow("  !") + `  ${label} skipped (not marked as managed by this kit)`)
    return
  }
  console.log(chalk.dim("  –") + `  ${label} not found`)
}

function removeManagedDirectory(dirPath: string, markerFilePath: string, marker: string, dryRun = false): RemoveResult {
  if (!existsSync(dirPath)) return "missing"
  if (!existsSync(markerFilePath)) return "skipped"
  const content = readFileSync(markerFilePath, "utf-8")
  if (!content.includes(marker)) return "skipped"
  safeRemovePath(dirPath, dryRun)
  return "removed"
}

function removeManagedFile(path: string, marker: string, dryRun = false): RemoveResult {
  if (!existsSync(path)) return "missing"
  const content = readFileSync(path, "utf-8")
  if (!content.includes(marker)) return "skipped"
  safeRemovePath(path, dryRun)
  return "removed"
}

function removeManagedPluginDirectory(
  dirPath: string,
  manifestRelativePath: string,
  dryRun = false
): RemoveResult {
  if (!existsSync(dirPath)) return "missing"
  if (!isManagedPluginDirectory(dirPath, manifestRelativePath)) return "skipped"
  safeRemovePath(dirPath, dryRun)
  return "removed"
}

function removeCodexMarketplaceEntry(dryRun = false): RemoveResult {
  if (!existsSync(CODEX_MARKETPLACE_PATH)) return "missing"

  const marketplace = readJsonFile(CODEX_MARKETPLACE_PATH)
  if (!isRecord(marketplace) || !Array.isArray(marketplace.plugins)) return "skipped"

  const plugins = marketplace.plugins
  const nextPlugins = plugins.filter(plugin => !(isRecord(plugin) && plugin.name === PLUGIN_NAME))
  if (nextPlugins.length === plugins.length) return "missing"

  writeJsonFile(CODEX_MARKETPLACE_PATH, { ...marketplace, plugins: nextPlugins }, dryRun)
  return "removed"
}

async function maybeRemoveCodexPluginRecord(dryRun = false) {
  if (dryRun) {
    console.log(chalk.dim(`  –  plugin record removal skipped during dry run`))
    return
  }

  if (!checkTool("codex").installed) {
    console.log(chalk.dim(`  –  plugin record not removed; run ${chalk.bold("codex plugin remove coding-agent-kit@personal")} later if needed`))
    return
  }

  if (!process.stdin.isTTY) {
    console.log(chalk.dim(`  –  plugin record not removed in non-interactive mode; run ${chalk.bold("codex plugin remove coding-agent-kit@personal")} later if needed`))
    return
  }

  if (!await confirm("Remove the Codex plugin record now?", true)) {
    console.log(chalk.dim(`  –  plugin record kept; run ${chalk.bold("codex plugin remove coding-agent-kit@personal")} later if needed`))
    return
  }

  const result = spawnSync("codex", ["plugin", "remove", `${PLUGIN_NAME}@personal`], {
    encoding: "utf-8",
  })

  if (result.status === 0) {
    console.log(chalk.green("  ✓") + "  plugin record removed")
    const output = `${result.stdout}${result.stderr}`.trim()
    if (output) console.log(chalk.dim(output.split("\n").map(line => `     ${line}`).join("\n")))
    return
  }

  console.log(chalk.yellow("  !") + "  plugin record remove failed")
  const output = `${result.stderr}${result.stdout}`.trim()
  if (output) console.log(chalk.dim(output.split("\n").map(line => `     ${line}`).join("\n")))
  console.log(chalk.dim(`     You can retry with: codex plugin remove ${PLUGIN_NAME}@personal`))
}

async function cmdUninstallCodex(options: CommandOptions) {
  console.log(chalk.bold(`\n🗑 ${CLI_NAME} — Codex uninstall\n`))
  console.log("Will remove only coding-agent-kit managed Codex files and blocks.\n")

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be removed.\n"))
  } else if (!await confirm("Remove coding-agent-kit managed Codex files?", false)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const agentsResult = removeManagedBlockFromFile(join(CODEX_HOME, "AGENTS.md"), CODEX_MANAGED_START_PREFIX, options.dryRun)
  printRemoveResult("AGENTS.md", agentsResult)

  for (const skillName of listDirNames(join(CODEX_DIR, "plugin", "skills"))) {
    const skillDir = join(CODEX_SKILLS_DIR, skillName)
    const result = removeManagedDirectory(skillDir, join(skillDir, "SKILL.md"), CODEX_SKILL_MARKER, options.dryRun)
    printRemoveResult(`skills/${skillName}`, result)
  }

  printRemoveResult("plugin/coding-agent-kit", safeRemovePath(CODEX_PLUGIN_DEST, options.dryRun) ? "removed" : "missing")
  printRemoveResult("marketplace entry", removeCodexMarketplaceEntry(options.dryRun))
  await maybeRemoveCodexPluginRecord(options.dryRun)

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Uninstall complete.\n"))
}

async function cmdUninstallOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🗑 ${CLI_NAME} — opencode uninstall\n`))
  console.log("Will remove only coding-agent-kit managed opencode files and blocks.\n")

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be removed.\n"))
  } else if (!await confirm("Remove coding-agent-kit managed opencode files?", false)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const agentsResult = removeManagedBlockFromFile(join(OPENCODE_CONFIG_DIR, "AGENTS.md"), OPENCODE_MANAGED_START_PREFIX, options.dryRun)
  printRemoveResult("AGENTS.md", agentsResult)

  for (const skillName of listDirNames(join(OPENCODE_DIR, "skills"))) {
    const skillDir = join(OPENCODE_CONFIG_DIR, "skills", skillName)
    const result = removeManagedDirectory(skillDir, join(skillDir, "SKILL.md"), OPENCODE_SKILL_MARKER, options.dryRun)
    printRemoveResult(`skills/${skillName}`, result)
  }

  for (const commandFile of listFileNames(join(OPENCODE_DIR, "commands"), ".md")) {
    const commandPath = join(OPENCODE_CONFIG_DIR, "commands", commandFile)
    const result = removeManagedFile(commandPath, OPENCODE_COMMAND_MARKER, options.dryRun)
    printRemoveResult(`commands/${commandFile.replace(/\.md$/, "")}`, result)
  }

  console.log(chalk.dim("  –  opencode.json preserved; review it manually if you want to remove merged permission defaults"))
  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Uninstall complete.\n"))
}

async function cmdUninstallAntigravity(options: CommandOptions) {
  console.log(chalk.bold(`\n🗑 ${CLI_NAME} — Antigravity uninstall\n`))
  console.log("Will remove only coding-agent-kit managed Antigravity plugin directories.\n")

  const surfaces = await resolveAntigravitySurfaces("uninstall", options.dryRun)
  if (surfaces.length === 0) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be removed.\n"))
  } else if (!await confirm("Remove coding-agent-kit managed Antigravity plugin files?", false)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  for (const surface of surfaces) {
    const result = removeManagedPluginDirectory(antigravitySurfacePath(surface), "plugin.json", options.dryRun)
    printRemoveResult(antigravitySurfaceLabel(surface), result)
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Uninstall complete.\n"))
}

async function cmdUninstallClaude(options: CommandOptions) {
  console.log(chalk.bold(`\n🗑 ${CLI_NAME} — Claude uninstall\n`))
  console.log("Will remove only coding-agent-kit managed Claude files and blocks.\n")

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be removed.\n"))
  } else if (!await confirm("Remove coding-agent-kit managed Claude files?", false)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const agentsResult = removeManagedBlockFromFile(CLAUDE_GLOBAL_INSTRUCTIONS_PATH, CLAUDE_MANAGED_START_PREFIX, options.dryRun)
  printRemoveResult("CLAUDE.md", agentsResult)

  const pluginResult = removeManagedPluginDirectory(CLAUDE_PLUGIN_DEST, join(".claude-plugin", "plugin.json"), options.dryRun)
  printRemoveResult("plugin/coding-agent-kit", pluginResult)

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Uninstall complete.\n"))
}

// ─── Commands: status ────────────────────────────────────────────────────────

async function printPackageStatus(target?: Target) {
  const current = getPackageVersion()
  const latest = await getLatestNpmVersion()

  console.log(chalk.bold(`\n${CLI_NAME}: v${current}`))
  if (!latest) {
    console.log(chalk.dim("Latest npm version: unavailable"))
    return
  }

  const updateTarget = target ? target : `<${TARGETS.join("|")}>`
  const comparison = compareVersions(current, latest)
  const newer = comparison === -1
  const latestLabel = newer
    ? chalk.yellow(`v${latest}`)
    : comparison === 1
      ? chalk.dim(`v${latest} (local newer)`)
      : chalk.green(`v${latest}`)
  console.log("Latest npm version: " + latestLabel)
  if (newer) {
    console.log(chalk.yellow("npm package update available:"))
    console.log(`  npm update -g ${CLI_NAME}`)
    console.log(`  ${CLI_NAME} update --target ${updateTarget}`)
  }
}

function getManagedBlockStatusItem(label: string, path: string, startPrefix: string): StatusItem {
  if (!existsSync(path)) return { label, ok: false }
  const content = readFileSync(path, "utf-8")
  const block = findManagedBlock(content, startPrefix)
  if (!block) return { label, ok: false, note: "managed block missing" }
  const version = getManagedBlockVersion(content, startPrefix)
  return {
    label,
    ok: true,
    version,
    stale: isStaleVersion(version),
    note: version ? undefined : "version unknown",
  }
}

function getManagedFileStatusItem(label: string, path: string): StatusItem {
  if (!existsSync(path)) return { label, ok: false }
  const version = getManagedFileVersion(path)
  return {
    label,
    ok: true,
    version,
    stale: isStaleVersion(version),
    note: version ? undefined : "version unknown",
  }
}

function getCodexPluginStatusItem(): StatusItem {
  const manifestPath = join(CODEX_PLUGIN_DEST, ".codex-plugin", "plugin.json")
  if (!existsSync(manifestPath)) return { label: "plugin/coding-agent-kit", ok: false }

  try {
    const manifest = readJsonFile(manifestPath)
    const version = isRecord(manifest) && typeof manifest.version === "string" ? manifest.version : null
    return {
      label: "plugin/coding-agent-kit",
      ok: true,
      version,
      stale: isStaleVersion(version),
      note: version ? undefined : "version unknown",
    }
  } catch {
    return { label: "plugin/coding-agent-kit", ok: true, stale: true, note: "manifest unreadable" }
  }
}

function getPluginManifestStatusItem(label: string, manifestPath: string): StatusItem {
  if (!existsSync(manifestPath)) return { label, ok: false }

  try {
    const manifest = readJsonFile(manifestPath)
    if (!isRecord(manifest) || manifest.name !== PLUGIN_NAME) {
      return { label, ok: false, note: "not a coding-agent-kit plugin" }
    }
    const version = typeof manifest.version === "string" ? manifest.version : null
    return {
      label,
      ok: true,
      version,
      stale: isStaleVersion(version),
      note: version ? undefined : "version unknown",
    }
  } catch {
    return { label, ok: true, stale: true, note: "manifest unreadable" }
  }
}

function printStatusItems(items: StatusItem[]) {
  for (const item of items) {
    const icon = item.ok ? chalk.green("  ✓") : chalk.red("  ✗")
    let line = `${icon}  ${item.label}`

    if (item.ok && item.version) {
      line += chalk.dim(` installed v${item.version}`)
    } else if (item.ok && item.stale) {
      line += chalk.dim(" version unknown")
    }

    if (item.stale) line += ` ${chalk.yellow("update available")}`
    if (item.note) line += chalk.dim(` (${item.note})`)
    console.log(line)
  }
}

function printInstallStatusSummary(platformName: string, target: Target, items: StatusItem[]) {
  const missing = items.filter(item => !item.ok)
  const stale = items.filter(item => item.ok && item.stale)

  if (missing.length > 0) {
    console.log(chalk.yellow(`\n${missing.length} item(s) missing. Run: `) + chalk.bold(`${CLI_NAME} install --target ${target}`))
  }

  if (stale.length > 0) {
    console.log(chalk.yellow(`${stale.length} item(s) stale. Run: `) + chalk.bold(`${CLI_NAME} update --target ${target}`))
  }

  if (missing.length === 0 && stale.length === 0) {
    console.log(chalk.green(`\n${platformName} kit is fully installed and up to date.`))
  }
}

async function cmdStatus(options: CommandOptions) {
  await printPackageStatus(options.target)

  if (options.target === "opencode") return cmdStatusOpencode()
  if (options.target === "codex") return cmdStatusCodex()
  if (options.target === "antigravity") return cmdStatusAntigravity()
  if (options.target === "claude") return cmdStatusClaude()

  await cmdStatusOpencode()
  await cmdStatusCodex()
  await cmdStatusAntigravity()
  await cmdStatusClaude()
}

async function cmdStatusOpencode() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — opencode status\n`))

  const { installed, version } = checkTool("opencode")
  console.log("opencode: " + (installed
    ? chalk.green(`✓ installed ${chalk.dim(version ?? "")}`)
    : chalk.red("✗ not installed")))

  const skillNames = listDirNames(join(OPENCODE_DIR, "skills"))
  const commandNames = listFileNames(join(OPENCODE_DIR, "commands"), ".md").map(name => name.replace(/\.md$/, ""))
  const checks = [
    getManagedBlockStatusItem("AGENTS.md managed block", join(OPENCODE_CONFIG_DIR, "AGENTS.md"), OPENCODE_MANAGED_START_PREFIX),
    { label: "opencode.json", ok: existsSync(join(OPENCODE_CONFIG_DIR, "opencode.json")) },
    ...skillNames.map(name => getManagedFileStatusItem(`skills/${name}`, join(OPENCODE_CONFIG_DIR, "skills", name, "SKILL.md"))),
    ...commandNames.map(name => getManagedFileStatusItem(`commands/${name}`, join(OPENCODE_CONFIG_DIR, "commands", `${name}.md`))),
  ]

  console.log(`\nKit files at ${chalk.dim(OPENCODE_CONFIG_DIR)}:`)
  printStatusItems(checks)

  const lang = getOpencodeManagedLang()
  if (lang) console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[lang]}`))

  printInstallStatusSummary("opencode", "opencode", checks)
  console.log("")
}

async function cmdStatusCodex() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — Codex status\n`))

  const codexDetected = detectCodex()
  console.log("Codex: " + (codexDetected.length > 0
    ? chalk.green(`✓ detected ${chalk.dim(`(${codexDetected.join(", ")})`)}`)
    : chalk.yellow("not detected")))

  const skillNames = listDirNames(join(CODEX_DIR, "plugin", "skills"))

  const checks = [
    getManagedBlockStatusItem("AGENTS.md managed block", join(CODEX_HOME, "AGENTS.md"), CODEX_MANAGED_START_PREFIX),
    ...skillNames.map(name => getManagedFileStatusItem(`skills/${name}`, join(CODEX_SKILLS_DIR, name, "SKILL.md"))),
    getCodexPluginStatusItem(),
    { label: "marketplace entry", ok: hasCodexMarketplaceEntry() },
  ]

  console.log(`\nCodex files:`)
  printStatusItems(checks)

  const lang = getCodexManagedLang()
  if (lang) console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[lang]}`))

  printInstallStatusSummary("Codex", "codex", checks)
  console.log("")
}

async function cmdStatusAntigravity() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — Antigravity status\n`))

  const detected = detectAntigravity()
  console.log("Antigravity: " + (detected.length > 0
    ? chalk.green(`✓ detected ${chalk.dim(`(${detected.join(", ")})`)}`)
    : chalk.yellow("not detected")))

  const skillNames = listDirNames(join(ANTIGRAVITY_DIR, "plugin", "skills"))
  const checks: StatusItem[] = []
  const installedSurfaces = getInstalledAntigravitySurfaces()
  const surfaces = installedSurfaces.length > 0 ? installedSurfaces : (["app", "cli"] as AntigravitySurface[])

  for (const surface of surfaces) {
    const pluginPath = antigravitySurfacePath(surface)
    const prefix = surface === "app" ? "app" : "cli"
    checks.push(getPluginManifestStatusItem(`${prefix}/plugin`, join(pluginPath, "plugin.json")))
    if (installedSurfaces.includes(surface)) {
      checks.push(getManagedFileStatusItem(`${prefix}/rules/coding-agent-kit`, join(pluginPath, "rules", "coding-agent-kit.md")))
      checks.push(...skillNames.map(name =>
        getManagedFileStatusItem(`${prefix}/skills/${name}`, join(pluginPath, "skills", name, "SKILL.md"))
      ))
    }
  }

  console.log("\nAntigravity plugin files:")
  printStatusItems(checks)

  const lang = getAntigravityManagedLang()
  if (lang) console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[lang]}`))

  printInstallStatusSummary("Antigravity", "antigravity", checks)
  console.log("")
}

async function cmdStatusClaude() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — Claude status\n`))

  const detected = detectClaude()
  console.log("Claude: " + (detected.length > 0
    ? chalk.green(`✓ detected ${chalk.dim(`(${detected.join(", ")})`)}`)
    : chalk.yellow("not detected")))

  const skillNames = listDirNames(join(CLAUDE_DIR, "plugin", "skills"))

  const checks = [
    getManagedBlockStatusItem("CLAUDE.md managed block", CLAUDE_GLOBAL_INSTRUCTIONS_PATH, CLAUDE_MANAGED_START_PREFIX),
    getPluginManifestStatusItem("plugin/coding-agent-kit", join(CLAUDE_PLUGIN_DEST, ".claude-plugin", "plugin.json")),
    ...skillNames.map(name => getManagedFileStatusItem(`skills/${name}`, join(CLAUDE_PLUGIN_DEST, "skills", name, "SKILL.md"))),
  ]

  console.log("\nClaude files:")
  printStatusItems(checks)

  const lang = getClaudeManagedLang()
  if (lang) console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[lang]}`))

  printInstallStatusSummary("Claude", "claude", checks)
  console.log("")
}

function hasCodexMarketplaceEntry(): boolean {
  if (!existsSync(CODEX_MARKETPLACE_PATH)) return false
  try {
    const marketplace = readJsonFile(CODEX_MARKETPLACE_PATH)
    if (!isRecord(marketplace) || !Array.isArray(marketplace.plugins)) return false
    return marketplace.plugins.some(plugin => isRecord(plugin) && plugin.name === PLUGIN_NAME)
  } catch {
    return false
  }
}

// ─── Commands: lang ──────────────────────────────────────────────────────────

async function cmdLang(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdLangOpencode(options)
  if (target === "codex") return cmdLangCodex(options)
  if (target === "antigravity") return cmdLangAntigravity(options)
  return cmdLangClaude(options)
}

async function cmdLangOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🌐 ${CLI_NAME} — set opencode language\n`))

  const lang = await resolveLang(options.lang)
  const changed = setOpencodeLang(lang, options.dryRun)
  if (!changed) {
    console.log(chalk.red(`opencode managed block not found. Run ${CLI_NAME} install --target opencode first.`))
    process.exit(1)
  }

  console.log(chalk.green("  ✓") + `  Communication section set to: ${LANG_LABELS[lang]}`)
  if (options.dryRun) console.log(chalk.yellow("  Dry run: no files were written."))
  console.log("")
}

async function cmdLangCodex(options: CommandOptions) {
  console.log(chalk.bold(`\n🌐 ${CLI_NAME} — set Codex language\n`))

  const lang = await resolveLang(options.lang)
  const changed = setCodexLang(lang, options.dryRun)
  if (!changed) {
    console.log(chalk.red(`Codex managed block not found. Run ${CLI_NAME} install --target codex first.`))
    process.exit(1)
  }

  console.log(chalk.green("  ✓") + `  Communication section set to: ${LANG_LABELS[lang]}`)
  if (options.dryRun) console.log(chalk.yellow("  Dry run: no files were written."))
  console.log("")
}

async function cmdLangAntigravity(options: CommandOptions) {
  console.log(chalk.bold(`\n🌐 ${CLI_NAME} — set Antigravity language\n`))

  const lang = await resolveLang(options.lang)
  const surfaces = await resolveAntigravitySurfaces("lang", options.dryRun)
  const installedSurfaces = getInstalledAntigravitySurfaces()
  const selected = surfaces.filter(surface => installedSurfaces.includes(surface))

  if (selected.length === 0) {
    console.log(chalk.red(`Antigravity plugin not found. Run ${CLI_NAME} install --target antigravity first.`))
    process.exit(1)
  }

  for (const surface of selected) {
    const result = copyAntigravityPlugin(antigravitySurfacePath(surface), lang, true, options.dryRun)
    if (result.skipped) {
      console.log(chalk.yellow("  !") + `  ${antigravitySurfaceLabel(surface)} skipped`)
    } else {
      console.log(chalk.green("  ✓") + `  ${antigravitySurfaceLabel(surface)} set to: ${LANG_LABELS[lang]}`)
    }
  }
  if (options.dryRun) console.log(chalk.yellow("  Dry run: no files were written."))
  console.log("")
}

async function cmdLangClaude(options: CommandOptions) {
  console.log(chalk.bold(`\n🌐 ${CLI_NAME} — set Claude language\n`))

  const lang = await resolveLang(options.lang)
  const changed = setClaudeLang(lang, options.dryRun)
  if (!changed) {
    console.log(chalk.red(`Claude managed block not found. Run ${CLI_NAME} install --target claude first.`))
    process.exit(1)
  }

  console.log(chalk.green("  ✓") + `  Communication section set to: ${LANG_LABELS[lang]}`)
  if (options.dryRun) console.log(chalk.yellow("  Dry run: no files were written."))
  console.log("")
}

// ─── Help/version ────────────────────────────────────────────────────────────

function cmdHelp() {
  const langList = SUPPORTED_LANGS.join("|")
  const targetList = TARGETS.join("|")
  console.log(`
${chalk.bold(CLI_NAME)} — setup kit for coding agents

  ${chalk.bold("Commands:")}
  ${chalk.cyan("install")} --target <${targetList}>  Install kit for one platform
  ${chalk.cyan("update")} --target <${targetList}>   Update managed kit files
  ${chalk.cyan("uninstall")} --target <${targetList}>
                                      Remove managed kit files
  ${chalk.cyan("status")} [--target <${targetList}>] Check installation status
  ${chalk.cyan("lang")} <${langList}> --target <${targetList}>
                                      Set the Communication language
  ${chalk.cyan("help")}                              Show this help

${chalk.bold("Options:")}
  ${chalk.cyan("--lang")} <${langList}>  Select language without prompting
  ${chalk.cyan("--target")} <target>    Target one platform
  ${chalk.cyan("--dry-run")}            Preview changes without writing files
  ${chalk.cyan("--force")}              Overwrite conflicting managed files where supported

${chalk.bold("Supported languages:")}
${SUPPORTED_LANGS.map(c => `  ${c} — ${LANG_LABELS[c]}`).join("\n")}

${chalk.bold("Examples:")}
  ${CLI_NAME} install --target codex --lang vi
  ${CLI_NAME} install --target opencode --lang ja
  ${CLI_NAME} install --target antigravity --lang vi
  ${CLI_NAME} install --target claude --lang vi
  ${CLI_NAME} update --target codex --dry-run
  ${CLI_NAME} uninstall --target antigravity --dry-run
  ${CLI_NAME} lang ko --target claude
  ${CLI_NAME} status
`)
}

function cmdVersion() {
  const version = getPackageVersion()
  console.log(version === "unknown" ? `${CLI_NAME} (version unknown)` : `${CLI_NAME} v${version}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2]
const options = getOptions(cmd)

async function main() {
  switch (cmd) {
    case "install": await cmdInstall(options); break
    case "update": await cmdUpdate(options); break
    case "uninstall": await cmdUninstall(options); break
    case "status": await cmdStatus(options); break
    case "lang": await cmdLang(options); break
    case "version":
    case "--version":
    case "-v":
      cmdVersion(); break
    default: cmdHelp(); break
  }
}

try {
  await main()
} finally {
  closeReadline()
}
