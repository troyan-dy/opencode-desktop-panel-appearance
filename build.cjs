// Build a self-contained GUI entry from the locally installed VS Code themes.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const extensions = path.join(os.homedir(), ".vscode", "extensions");
const read = p => JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
function extension(id) {
  const versions = fs.readdirSync(extensions).filter(x=>x.startsWith(id+"-"))
    .sort((a,b)=>b.localeCompare(a,"en",{numeric:true}));
  if (!versions.length) throw Error(`Missing VS Code extension: ${id}`);
  return path.join(extensions, versions[0]);
}
const dir=extension("emmanuelbeziat.vscode-great-icons");
const def=read(path.join(dir,"icons.json"));
const assets=Object.fromEntries(Object.entries(def.iconDefinitions).map(([id,{iconPath}])=>{
  const mime={".png":"image/png",".svg":"image/svg+xml"}[path.extname(iconPath)];
  if(!mime) throw Error(iconPath);
  return [id,`url("data:${mime};base64,${fs.readFileSync(path.resolve(dir,iconPath)).toString("base64")}")`];
}));
const colors=read(path.join(extension("zhuangtongfa.material-theme"),"themes","OneDark-Pro.json")).colors;
const slimColors=Object.fromEntries(Object.entries(colors).filter(([k])=>/^(gitDecoration\.ignoredResourceForeground|sideBar\.(background|foreground)|list\.(activeSelection|inactiveSelection|hover)(Foreground|Background))$/.test(k)));
const theme={...def,iconDefinitions:assets,colors:slimColors};
const src=fs.readFileSync(path.join(__dirname,"panel.cjs"),"utf8");
fs.writeFileSync(path.join(__dirname,"gui-experimental.cjs"),src.replace("/* @theme */ null",()=>JSON.stringify(theme)));
console.log(`Built ${Object.keys(assets).length} icon assets and ${Object.keys(slimColors).length} explorer colors`);
