import { spawnSync } from "child_process"
import {
  existsSync, mkdirSync, copyFileSync,
  readdirSync, statSync, readFileSync, writeFileSync
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
const OVERLAYS_DIR = join(SHARED_DIR, "overlays")

const CLI_NAME = "coding-agent-kit"
const PLUGIN_NAME = "coding-agent-kit"

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode")
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex")
const CODEX_AGENTS_DIR = join(homedir(), ".agents")
const CODEX_SKILLS_DIR = join(CODEX_AGENTS_DIR, "skills")
const CODEX_PLUGIN_DEST = join(homedir(), "plugins", PLUGIN_NAME)
const CODEX_MARKETPLACE_PATH = join(CODEX_AGENTS_DIR, "plugins", "marketplace.json")

const SUPPORTED_LANGS = ["en", "vi", "ja", "ko", "zh", "es", "fr", "de"] as const
type Lang = typeof SUPPORTED_LANGS[number]

const TARGETS = ["opencode", "codex"] as const
type Target = typeof TARGETS[number]

type CommandOptions = {
  target?: Target
  lang?: string
  dryRun: boolean
  force: boolean
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
const CODEX_MANAGED_START_PREFIX = "<!-- CODING_AGENT_KIT_START target=codex"
const CODEX_MANAGED_END = "<!-- CODING_AGENT_KIT_END -->"
const CODEX_SKILL_MARKER = "CODING_AGENT_KIT_MANAGED"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) })
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

  const answer = await ask("> ")
  if (answer === "1" || answer.toLowerCase() === "opencode") return "opencode"
  if (answer === "2" || answer.toLowerCase() === "codex") return "codex"
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

function upsertCodexAgentsBlock(lang: Lang, dryRun = false): "created" | "updated" | "appended" {
  const agentsPath = join(CODEX_HOME, "AGENTS.md")
  const block = buildCodexManagedBlock(lang)

  if (!existsSync(agentsPath)) {
    writeTextFile(agentsPath, `${block}\n`, dryRun)
    return "created"
  }

  const content = readFileSync(agentsPath, "utf-8")
  const existing = findCodexManagedBlock(content)
  if (existing) {
    const updated = content.slice(0, existing.start) + block + content.slice(existing.end)
    writeTextFile(agentsPath, updated.endsWith("\n") ? updated : `${updated}\n`, dryRun)
    return "updated"
  }

  const separator = content.endsWith("\n") ? "\n" : "\n\n"
  writeTextFile(agentsPath, `${content}${separator}${block}\n`, dryRun)
  return "appended"
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

// ─── Commands: install ───────────────────────────────────────────────────────

async function cmdInstall(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdInstallOpencode(options)
  return cmdInstallCodex(options)
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
  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log(`\nWill install opencode kit into: ${chalk.cyan(OPENCODE_CONFIG_DIR)}\n`)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else if (!await confirm("Continue?", true)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  if (!options.dryRun) mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true })

  const agentsDest = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  if (existsSync(agentsDest)) {
    if (options.force || options.dryRun || await confirm(chalk.yellow("AGENTS.md already exists. Overwrite?"))) {
      if (!options.dryRun) {
        copyFileSync(join(OPENCODE_DIR, "AGENTS.md"), agentsDest)
        applyLanguageOverlay(agentsDest, lang, join(OPENCODE_DIR, "AGENTS.md"))
      }
      console.log(chalk.green("  ✓") + "  AGENTS.md (overwritten)")
    } else {
      console.log(chalk.dim("  –  AGENTS.md skipped"))
    }
  } else {
    if (!options.dryRun) {
      copyFileSync(join(OPENCODE_DIR, "AGENTS.md"), agentsDest)
      applyLanguageOverlay(agentsDest, lang, join(OPENCODE_DIR, "AGENTS.md"))
    }
    console.log(chalk.green("  ✓") + "  AGENTS.md")
  }

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

  const spinner = ora("Checking Codex CLI...").start()
  const { installed, version } = checkTool("codex")
  if (installed) {
    spinner.succeed(`Codex CLI is installed ${chalk.dim(version ?? "")}`)
  } else {
    spinner.warn("Codex CLI was not found. Continuing because Codex app can still use the installed files.")
  }

  const lang = await resolveLang(options.lang)
  console.log(chalk.dim(`\nLanguage: ${LANG_LABELS[lang]}`))
  console.log("\nWill install Codex kit into:")
  console.log(`  ${chalk.cyan(join(CODEX_HOME, "AGENTS.md"))} (managed block only)`)
  console.log(`  ${chalk.cyan(CODEX_SKILLS_DIR)}`)
  console.log(`  ${chalk.cyan(CODEX_PLUGIN_DEST)}`)
  console.log(`  ${chalk.cyan(CODEX_MARKETPLACE_PATH)}\n`)

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else if (!await confirm("Continue?", true)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const agentsAction = upsertCodexAgentsBlock(lang, options.dryRun)
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

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Install complete!\n"))
  console.log("Next steps:")
  console.log(`  ${chalk.cyan("1.")} Restart Codex or start a new Codex session`)
  console.log(`  ${chalk.cyan("2.")} Use ${chalk.bold("$coding-agent-scan-project")} to initialize an existing project`)
  console.log(`  ${chalk.cyan("3.")} Optional: install the plugin from Codex Plugins or run ${chalk.bold("codex plugin add coding-agent-kit@personal")}\n`)
}

// ─── Commands: update ────────────────────────────────────────────────────────

async function cmdUpdate(options: CommandOptions) {
  const target = await resolveTarget(options.target)
  if (target === "opencode") return cmdUpdateOpencode(options)
  return cmdUpdateCodex(options)
}

async function cmdUpdateOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — opencode update\n`))

  if (!checkTool("opencode").installed) {
    console.log(chalk.red(`opencode is not installed. Run ${CLI_NAME} install --target opencode first.`))
    process.exit(1)
  }

  console.log(`Updating: ${chalk.cyan(OPENCODE_CONFIG_DIR)}\n`)
  console.log(chalk.yellow("This will overwrite skills and commands. AGENTS.md and opencode.json keys are preserved.\n"))

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else if (!await confirm("Continue?", true)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const s = copyDir(join(OPENCODE_DIR, "skills"), join(OPENCODE_CONFIG_DIR, "skills"), true, options.dryRun)
  console.log(chalk.green("  ✓") + `  skills/ — ${s.length} files updated`)

  const c = copyDir(join(OPENCODE_DIR, "commands"), join(OPENCODE_CONFIG_DIR, "commands"), true, options.dryRun)
  console.log(chalk.green("  ✓") + `  commands/ — ${c.length} files updated`)

  const jsonDest = join(OPENCODE_CONFIG_DIR, "opencode.json")
  if (existsSync(jsonDest)) {
    mergeJson(jsonDest, join(OPENCODE_DIR, "opencode.json"), options.dryRun)
    console.log(chalk.green("  ✓") + "  opencode.json (merged new keys)")
  }

  if (options.lang) {
    const lang = await resolveLang(options.lang)
    const agentsDest = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
    if (existsSync(agentsDest)) {
      if (!options.dryRun) applyLanguageOverlay(agentsDest, lang, join(OPENCODE_DIR, "AGENTS.md"))
      console.log(chalk.green("  ✓") + `  AGENTS.md Communication section updated (${LANG_LABELS[lang]})`)
    }
  }

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
}

async function cmdUpdateCodex(options: CommandOptions) {
  console.log(chalk.bold(`\n🔄 ${CLI_NAME} — Codex update\n`))

  const currentLang = getCodexManagedLang()
  const lang = options.lang ? await resolveLang(options.lang) : currentLang ?? "en"

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run: no files will be written.\n"))
  } else if (!await confirm("Continue?", true)) {
    console.log(chalk.dim("Cancelled."))
    process.exit(0)
  }

  const agentsAction = upsertCodexAgentsBlock(lang, options.dryRun)
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

  console.log(chalk.bold.green(options.dryRun ? "\n✅ Dry run complete.\n" : "\n✅ Update complete!\n"))
  console.log(`If you installed the plugin, refresh its cache with: ${chalk.bold("codex plugin add coding-agent-kit@personal")}\n`)
}

// ─── Commands: status ────────────────────────────────────────────────────────

async function cmdStatus(options: CommandOptions) {
  if (options.target === "opencode") return cmdStatusOpencode()
  if (options.target === "codex") return cmdStatusCodex()

  await cmdStatusOpencode()
  await cmdStatusCodex()
}

async function cmdStatusOpencode() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — opencode status\n`))

  const { installed, version } = checkTool("opencode")
  console.log("opencode: " + (installed
    ? chalk.green(`✓ installed ${chalk.dim(version ?? "")}`)
    : chalk.red("✗ not installed")))

  const checks = [
    { label: "AGENTS.md", path: join(OPENCODE_CONFIG_DIR, "AGENTS.md") },
    { label: "opencode.json", path: join(OPENCODE_CONFIG_DIR, "opencode.json") },
    { label: "skills/coding-agent-scan-project", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-scan-project/SKILL.md") },
    { label: "skills/coding-agent-write-docs", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-write-docs/SKILL.md") },
    { label: "skills/coding-agent-setup-project", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-setup-project/SKILL.md") },
    { label: "skills/coding-agent-skill-creator", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-skill-creator/SKILL.md") },
    { label: "skills/coding-agent-brainstorm-feature", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-brainstorm-feature/SKILL.md") },
    { label: "skills/coding-agent-write-plan", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-write-plan/SKILL.md") },
    { label: "skills/coding-agent-implement-task", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-implement-task/SKILL.md") },
    { label: "skills/coding-agent-review-feature", path: join(OPENCODE_CONFIG_DIR, "skills/coding-agent-review-feature/SKILL.md") },
    { label: "commands/init-existing", path: join(OPENCODE_CONFIG_DIR, "commands/init-existing.md") },
    { label: "commands/init-new", path: join(OPENCODE_CONFIG_DIR, "commands/init-new.md") },
    { label: "commands/skill-new", path: join(OPENCODE_CONFIG_DIR, "commands/skill-new.md") },
    { label: "commands/brainstorm", path: join(OPENCODE_CONFIG_DIR, "commands/brainstorm.md") },
    { label: "commands/plan", path: join(OPENCODE_CONFIG_DIR, "commands/plan.md") },
    { label: "commands/implement", path: join(OPENCODE_CONFIG_DIR, "commands/implement.md") },
    { label: "commands/review", path: join(OPENCODE_CONFIG_DIR, "commands/review.md") },
  ]

  console.log(`\nKit files at ${chalk.dim(OPENCODE_CONFIG_DIR)}:`)
  for (const { label, path } of checks) {
    console.log((existsSync(path) ? chalk.green("  ✓") : chalk.red("  ✗")) + "  " + label)
  }

  const agentsPath = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  if (existsSync(agentsPath)) {
    const content = readFileSync(agentsPath, "utf-8")
    console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[detectLangFromContent(content)]}`))
  }

  const missing = checks.filter(c => !existsSync(c.path))
  if (missing.length > 0) {
    console.log(chalk.yellow(`\n${missing.length} file(s) missing. Run: `) + chalk.bold(`${CLI_NAME} install --target opencode`))
  } else {
    console.log(chalk.green("\nopencode kit is fully installed."))
  }
  console.log("")
}

async function cmdStatusCodex() {
  console.log(chalk.bold(`\n📋 ${CLI_NAME} — Codex status\n`))

  const { installed, version } = checkTool("codex")
  console.log("Codex CLI: " + (installed
    ? chalk.green(`✓ installed ${chalk.dim(version ?? "")}`)
    : chalk.yellow("not found")))

  const skillNames = existsSync(join(CODEX_DIR, "plugin", "skills"))
    ? readdirSync(join(CODEX_DIR, "plugin", "skills")).filter(name => statSync(join(CODEX_DIR, "plugin", "skills", name)).isDirectory())
    : []

  const checks = [
    { label: "AGENTS.md managed block", ok: hasCodexManagedBlock() },
    ...skillNames.map(name => ({ label: `skills/${name}`, ok: existsSync(join(CODEX_SKILLS_DIR, name, "SKILL.md")) })),
    { label: "plugin/coding-agent-kit", ok: existsSync(join(CODEX_PLUGIN_DEST, ".codex-plugin", "plugin.json")) },
    { label: "marketplace entry", ok: hasCodexMarketplaceEntry() },
  ]

  console.log(`\nCodex files:`)
  for (const { label, ok } of checks) {
    console.log((ok ? chalk.green("  ✓") : chalk.red("  ✗")) + "  " + label)
  }

  const lang = getCodexManagedLang()
  if (lang) console.log(chalk.dim(`\nCommunication language: ${LANG_LABELS[lang]}`))

  const missing = checks.filter(c => !c.ok)
  if (missing.length > 0) {
    console.log(chalk.yellow(`\n${missing.length} item(s) missing. Run: `) + chalk.bold(`${CLI_NAME} install --target codex`))
  } else {
    console.log(chalk.green("\nCodex kit is fully installed."))
  }
  console.log("")
}

function hasCodexManagedBlock(): boolean {
  const agentsPath = join(CODEX_HOME, "AGENTS.md")
  if (!existsSync(agentsPath)) return false
  return findCodexManagedBlock(readFileSync(agentsPath, "utf-8")) !== null
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
  return cmdLangCodex(options)
}

async function cmdLangOpencode(options: CommandOptions) {
  console.log(chalk.bold(`\n🌐 ${CLI_NAME} — set opencode language\n`))

  const agentsPath = join(OPENCODE_CONFIG_DIR, "AGENTS.md")
  if (!existsSync(agentsPath)) {
    console.log(chalk.red(`AGENTS.md not found. Run ${CLI_NAME} install --target opencode first.`))
    process.exit(1)
  }

  const lang = await resolveLang(options.lang)
  if (!options.dryRun) applyLanguageOverlay(agentsPath, lang, join(OPENCODE_DIR, "AGENTS.md"))

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

// ─── Help/version ────────────────────────────────────────────────────────────

function cmdHelp() {
  const langList = SUPPORTED_LANGS.join("|")
  console.log(`
${chalk.bold(CLI_NAME)} — setup kit for coding agents

${chalk.bold("Commands:")}
  ${chalk.cyan("install")} --target <opencode|codex>  Install kit for one platform
  ${chalk.cyan("update")} --target <opencode|codex>   Update managed kit files
  ${chalk.cyan("status")} [--target <opencode|codex>] Check installation status
  ${chalk.cyan("lang")} <${langList}> --target <opencode|codex>
                                      Set the Communication language
  ${chalk.cyan("help")}                              Show this help

${chalk.bold("Options:")}
  ${chalk.cyan("--lang")} <${langList}>  Select language without prompting
  ${chalk.cyan("--target")} <target>    Target one platform; "all" is intentionally unsupported
  ${chalk.cyan("--dry-run")}            Preview changes without writing files
  ${chalk.cyan("--force")}              Overwrite conflicting managed files where supported

${chalk.bold("Supported languages:")}
${SUPPORTED_LANGS.map(c => `  ${c} — ${LANG_LABELS[c]}`).join("\n")}

${chalk.bold("Examples:")}
  ${CLI_NAME} install --target codex --lang vi
  ${CLI_NAME} install --target opencode --lang ja
  ${CLI_NAME} update --target codex --dry-run
  ${CLI_NAME} lang ko --target opencode
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

switch (cmd) {
  case "install": await cmdInstall(options); break
  case "update": await cmdUpdate(options); break
  case "status": await cmdStatus(options); break
  case "lang": await cmdLang(options); break
  case "version":
  case "--version":
  case "-v":
    cmdVersion(); break
  default: cmdHelp(); break
}
