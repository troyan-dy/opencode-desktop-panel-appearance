import { Plugin } from "@opencode/plugin"
import { Rpc } from "@opencode/plugin/rpc"
import { execFile } from "node:child_process"

const paths = { type: "array", maxItems: 512, items: { type: "string", maxLength: 4096 } } as const
const rpc = Rpc.define({ id: "panel-appearance.ignored", events: {}, methods: {
  check: {
    input: { type: "object", properties: { paths }, required: ["paths"], additionalProperties: false },
    output: { type: "object", properties: { ignored: paths }, required: ["ignored"], additionalProperties: false },
  },
} })

async function ignored(cwd: string, names: string[], signal: AbortSignal): Promise<string[]> {
  if (!names.length || signal.aborted) return []
  const result = await new Promise<{code: unknown; stdout: string; stderr: string}>(resolve => {
    const child = execFile("git", ["check-ignore", "-z", "--stdin"], {
      cwd, signal, timeout: 3500, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0" },
    }, (err, stdout, stderr) => resolve({code: err?.code ?? 0, stdout, stderr}))
    child.stdin?.on("error", () => {}) // Git can exit early outside a repository.
    child.stdin?.end(names.map(name => "./" + name + "\0").join(""))
  })
  if (result.code === 0) return result.stdout.split("\0").filter(Boolean).map(s=>s.slice(2))
  // A path inside a symlink or submodule can abort a whole batch; keep its siblings.
  if (result.code === 128 && names.length > 1 && /beyond a symbolic link|is in submodule/.test(result.stderr)) {
    const mid = Math.floor(names.length / 2)
    return [...await ignored(cwd,names.slice(0,mid),signal), ...await ignored(cwd,names.slice(mid),signal)]
  }
  return []
}

export default Plugin.define({
  id: "panel-appearance",
  async setup(ctx) {
    await ctx.rpc.register(rpc, { async check(input, call) {
      const names = (input as {paths: string[]}).paths.filter(s =>
        s.length && !/^(?:[\\/]|[a-z]:)|\0|\\/i.test(s) && !s.split("/").some(p=>p===".." || p===".git"))
      return { ignored: await ignored(ctx.location.directory, names, call.signal) }
    } })
  },
})
