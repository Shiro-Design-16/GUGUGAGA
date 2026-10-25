/**
 * 咕咕嘎嘎语 · 多文件工程载入（SPEC.md §5 语义的延伸；权威描述待补进 SPEC）。
 *
 * 两条规则：
 *  1. 文件分两种——**有入口的是程序**（独立运行，绝不被别人当库），**没有入口的是库**；
 *  2. 库的可见性只看目录位置（祖先链）：一个文件能看见「自己所在目录 + 它的所有祖先目录」里的库，
 *     看不见兄弟分支，也看不见更深的目录——越浅越基础，越深越具体。
 * 项目根：从入口所在目录向上爬，只要父目录里直接躺着程序文件就继续爬。
 *
 * 合并后的 Program 仍然只有一份类表和一个入口，所以静态检查与解释器完全不知道「多文件」这回事。
 */

import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

import type { ClassDecl, EntryDecl, Program } from "./ast.ts";
import { CODE, GgError } from "./errors.ts";
import { DECL, hasProgramSuffix, type Token } from "./keywords.ts";
import { tokenize } from "./lexer.ts";
import { parseUnit, type ParsedUnit } from "./parser.ts";

/** 递归扫描时跳过的目录：VCS 与依赖目录里的 .咕咕 不属于本项目。 */
const SKIP_DIRS = new Set(["node_modules"]);

/**
 * 系统临时目录不作为项目根：否则紧邻的无关项目会被合并进来。
 * macOS 上 `/tmp` 只是 `/private/tmp` 的软链，`os.tmpdir()` 又是第三条路径，三条都记上。
 */
const TEMP_ROOTS = new Set([realOrResolve(tmpdir()), realOrResolve("/tmp")]);

/** 软链解析失败（路径可能不存在）时退回字面路径。 */
function realOrResolve(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    return resolve(target);
  }
}

/**
 * 剥掉首行的 #! 行（替换成空行，保住行号）。
 * 只为让 .咕咕 文件能当可执行脚本；# 不进语言本身，词法器仍然拒收它。
 */
export function stripShebang(source: string): string {
  if (!source.startsWith("#!")) return source;
  const nl = source.indexOf("\n");
  return nl === -1 ? "\n" : "\n" + source.slice(nl + 1);
}

/** candidateDir 是否是 readerDir 的祖先（含同一目录）：这是多文件的唯一可见性规则。 */
export function isVisibleDir(readerDir: string, candidateDir: string): boolean {
  const reader = resolve(readerDir);
  const candidate = resolve(candidateDir);
  return reader === candidate || reader.startsWith(candidate + sep);
}

function hasProgramFiles(dir: string): boolean {
  try {
    return readdirSync(dir, { withFileTypes: true }).some(
      (entry) => entry.isFile() && hasProgramSuffix(entry.name),
    );
  } catch {
    return false;
  }
}

/** 入口文件 → 项目根（最高一层「父目录里还躺着程序文件」的目录）。 */
export function projectRootOf(entryFile: string): string {
  let dir = resolve(dirname(entryFile));
  for (;;) {
    const parent = dirname(dir);
    if (parent === dir || TEMP_ROOTS.has(realOrResolve(parent))) return dir;
    if (!hasProgramFiles(parent)) return dir;
    dir = parent;
  }
}

/** 递归收集项目里的程序文件（绝对路径，按字典序，跳过以 . 开头的目录与 node_modules）。 */
export function collectProgramFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile() && hasProgramSuffix(entry.name)) {
        found.push(join(dir, entry.name));
      }
    }
  };
  walk(resolve(root));
  found.sort();
  return found;
}

/** 源码里出现顶层入口声明就算「这是一个程序」：解析失败时用它判断该不该连累入口文件。 */
function isProgramSource(source: string): boolean {
  let tokens: Token[];
  try {
    tokens = tokenize(source);
  } catch {
    return false;
  }
  return tokens.some((token) => token.kind === "DECL" && DECL[token.text] === "Entry");
}

export interface ProjectLoad {
  /** 合并后的程序：类表来自所有可见的库，入口只来自命令行指定的那个文件 */
  program: Program;
  /** 参与编译的库与入口（相对项目根，按路径排序） */
  files: string[];
  /** 存在、但不属于可见范围的库里的类：类名 → 文件名（只用来写「有，但你看不见」的提示） */
  hidden: ReadonlyMap<string, string>;
}

function readProgram(file: string): string {
  return stripShebang(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
}

/** 诊断里的文件名：相对项目根，别把本机绝对路径漏出去。 */
function labelOf(root: string, file: string): string {
  const rel = relative(root, file);
  return rel === "" ? file : rel;
}

/**
 * 载入入口文件所在工程：
 *   带入口的文件是独立程序，只贡献自己的入口，类不进别人的工程；
 *   无入口的文件是库，可见（祖先链）则并入类表，不可见则只记类名以备提示；
 *   库里的语法错误带上文件名；不可见库、以及解析失败但看着像程序的邻居，一律不连累入口。
 * 入口缺失、类名重复、父类未定义等仍由 validate 报。
 */
export function loadProject(entryFile: string, entrySource: string): ProjectLoad {
  const entryAbs = resolve(entryFile);
  const root = projectRootOf(entryAbs);
  const entryDir = dirname(entryAbs);

  const all = collectProgramFiles(root);
  if (!all.includes(entryAbs)) all.push(entryAbs);
  all.sort();

  const classes: ClassDecl[] = [];
  const owner = new Map<string, string>();
  const hidden = new Map<string, string>();
  const files: string[] = [];
  let entry: EntryDecl | null = null;

  const merge = (unit: ParsedUnit, label: string): void => {
    for (const cls of unit.classes) {
      const previous = owner.get(cls.name);
      if (previous !== undefined) {
        throw new GgError(CODE.DupClass, cls.pos, `重复的类名“${cls.name}”：${previous} 与 ${label}`);
      }
      owner.set(cls.name, label);
      classes.push(cls);
    }
  };

  for (const file of all) {
    const label = labelOf(root, file);

    if (file === entryAbs) {
      const unit = parseUnit(entrySource);
      merge(unit, label);
      entry = unit.entry;
      files.push(label);
      continue;
    }

    const visible = isVisibleDir(entryDir, dirname(file));
    let source: string;
    try {
      source = readProgram(file);
    } catch {
      continue;
    }

    let unit: ParsedUnit;
    try {
      // 词法就过不去的文件当不成库（多半是写坏的另一份程序），跳过它比拖累入口有用。
      tokenize(source);
    } catch {
      continue;
    }
    try {
      unit = parseUnit(source);
    } catch (err) {
      if (!visible || isProgramSource(source) || !(err instanceof GgError)) continue;
      throw new GgError(err.code, err.pos, `${label}：${err.message}`);
    }

    if (unit.entry !== null) continue; // 有入口 = 独立程序，不当库
    if (!visible) {
      for (const cls of unit.classes) {
        if (!hidden.has(cls.name)) hidden.set(cls.name, label);
      }
      continue;
    }

    merge(unit, label);
    files.push(label);
  }

  for (const name of owner.keys()) hidden.delete(name);

  return { program: { kind: "Program", classes, entry }, files, hidden };
}
