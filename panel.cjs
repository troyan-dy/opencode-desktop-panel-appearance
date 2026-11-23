const { Plugin, Style, SettingsPage, Store } = require("@opencode/plugin/gui");
const { Schema } = require("effect");
const { createComponent, createEffect } = require("solid-js");
const theme = /* @theme */ null;
const treeHost = ".opencode-pierre-file-tree";
const normalize = value => Number.isFinite(value) ? Math.min(20, Math.max(12,Math.round(value))) : 14;

// CSS matches recycled rows whenever their path changes, including before first paint.
function mapping(attr, {folder=false, expanded=false}={}) {
  const out=[];
  const within=(tag,id)=>out.push(`&${tag}{--lp-icon:var(--lpi${id})}`);
  const exact = (s, folder) => {
    const v=JSON.stringify(s), tail=JSON.stringify("/"+s);
    let rules=[`[${attr}=${v} i]`,`[${attr}$=${tail} i]`];
    if(folder) rules.push(`[${attr}=${JSON.stringify(s+"/")} i]`,`[${attr}$=${JSON.stringify("/"+s+"/")} i]`);
    return `:is(${rules.join(",")})`;
  };
  // All selectors have equal specificity: filenames override compound extensions,
  // which override single extensions. Folder rules live in their own scope.
  if(!folder){
    for(const [ext,id] of Object.entries(theme.fileExtensions).sort(([a],[b])=>a.length-b.length))
      within(`[${attr}$=${JSON.stringify("."+ext)} i]`,id);
  }
  for(const [name,id] of Object.entries(folder?(expanded?theme.folderNamesExpanded:theme.folderNames):theme.fileNames))
    within(exact(name,folder),id);
  return out.join("\n");
}
const iconVars=Object.entries(theme.iconDefinitions).map(([id,url])=>`--lpi${id}:${url};`).join("");
const treeCss=`
  :host { --trees-font-size:var(--lp-nav-size,14px); }
  [data-item-type=file]{--lp-icon:var(--lpi${theme.file});${mapping("data-item-path")}}
  [data-item-type=folder]{--lp-icon:var(--lpi${theme.folder});${mapping("data-item-path",{folder:true})}}
  [data-item-type=folder][aria-expanded=true]{--lp-icon:var(--lpi${theme.folderExpanded});${mapping("data-item-path",{folder:true,expanded:true})}}
  [data-item-section=content]{font-size:var(--lp-nav-size,14px)}
  [data-lp-ignored] > [data-item-section=content],
  [data-item-git-status=ignored] > [data-item-section=content]{color:var(--lp-ignored,var(--v2-text-text-faint))}
  [data-lp-ignored] > [data-item-section=icon]{opacity:.55}
  [data-item-section=icon]{overflow:visible}
  [data-item-type=file] [data-item-section=icon]>svg{display:none}
  [data-item-section=icon]::after{content:"";flex:none;width:16px;height:16px;background:var(--lp-icon) center/contain no-repeat}
  [data-item-type=folder] [data-item-section=icon]{width:auto}
  [data-item-type=folder] [data-item-section=icon]>svg{width:12px}
`;
const palette=theme.colors;
const docCss=`
  #review-panel {${iconVars}}
  :root[data-color-scheme=dark] #review-panel {
    --lp-ignored:${palette["gitDecoration.ignoredResourceForeground"]};
    --lp-tree-bg:${palette["sideBar.background"]};--lp-tree-fg:${palette["sideBar.foreground"]};
    --lp-tree-hover:${palette["list.hoverBackground"]};--lp-tree-selected:${palette["list.activeSelectionBackground"]};
    --lp-tree-selected-fg:${palette["list.activeSelectionForeground"]};
    --lp-tree-inactive:${palette["list.inactiveSelectionBackground"]};
  }
  #review-panel ${treeHost} {
    --trees-font-size:var(--lp-nav-size,14px);
  }
  :root[data-color-scheme=dark] #review-panel ${treeHost}{
    --v2-background-bg-base:var(--lp-tree-bg);--v2-text-text-muted:var(--lp-tree-fg);
    --v2-overlay-simple-overlay-hover:var(--lp-tree-hover);
    --v2-overlay-simple-overlay-pressed:var(--lp-tree-inactive);--v2-text-text-base:var(--lp-tree-selected-fg)
  }
  :root[data-color-scheme=dark] #review-panel ${treeHost}:focus-within{--v2-overlay-simple-overlay-pressed:var(--lp-tree-selected)}
  #review-panel :is([role=tab],[role=tab] span,[data-slot=file-tree-v2-label] span,[role=combobox],
    [data-pane-content] [role=tabpanel] button.h-\\[41px\\] > span:first-child,
    [data-slot=artifact-filename]) {font-size:var(--lp-nav-size,14px)}
  #review-panel [data-pane-tab^="file://"] {
    --lp-icon:var(--lpi${theme.file});
    ${mapping("data-pane-tab")}
  }
  #review-panel [data-pane-tab^="file://"] :has(> .tab-fileicon-color){
    background:var(--lp-icon) center/contain no-repeat;
  }
  #review-panel [data-pane-tab^="file://"] :is(.tab-fileicon-color,.tab-fileicon-mono){visibility:hidden}
  #review-panel [data-slot=file-tree-v2-row][data-path] {
    --lp-icon:var(--lpi${theme.file});
    ${mapping("data-path")}
  }
  #review-panel [data-slot=file-tree-v2-row][data-path] > svg:first-child {display:none}
  #review-panel [data-slot=file-tree-v2-row][data-path]::before{content:"";width:16px;height:16px;flex:none;background:var(--lp-icon) center/contain no-repeat}
  #review-panel [data-slot=file-tree-v2-row][data-lp-ignored] [data-slot=file-tree-v2-label] span{color:var(--lp-ignored,var(--v2-text-text-faint))}
  #review-panel [data-slot=file-tree-v2-row][data-lp-ignored]::before{opacity:.55}
`;

// Batch the mounted rows rather than enumerating large ignored directories.
function ignoreDecorations(ctx, roots) {
  const rpc={id:"panel-appearance.ignored",methods:{check:{input:{type:"object"},output:{type:"object"}}}};
  const list="[data-slot=file-tree-v2-row][data-path]", tree="[data-item-path][data-type=item]";
  let directory, cache=new Map(), scheduled=0, request, disposed=false;
  function rows(){
    const out=[...document.querySelectorAll("#review-panel "+list)];
    for(const r of roots)if(r.host.isConnected)out.push(...r.querySelectorAll(tree));
    return out.filter(el=>el.getClientRects().length && el.checkVisibility());
  }
  const pathOf=el=>(el.dataset.itemPath??el.dataset.path).replaceAll("\\","/");
  function schedule(){if(!disposed&&!scheduled)scheduled=requestAnimationFrame(refresh)}
  async function refresh(){
    scheduled=0;
    const session=ctx.sessions?.current();
    const dir=session?.server.builtin?(ctx.screen.current()?.file.root || session.directory):null;
    if(dir!==directory){request?.abort();cache=new Map();directory=dir}
    const visible=rows(),missing=new Set();
    for(const el of visible){
      const p=pathOf(el);
      el.toggleAttribute("data-lp-ignored",cache.get(p)===true);
      if(!cache.has(p))missing.add(p);
    }
    if(!dir || !missing.size || request || document.hidden)return;
    const controller=new AbortController();request=controller;
    const paths=[...missing].slice(0,512), saved=cache;
    try {
      const result=await ctx.client.rpc(rpc).check({paths},{location:{directory:dir},signal:controller.signal});
      if(controller.signal.aborted || saved!==cache)return;
      const ignored=new Set(result.ignored);
      for(const p of paths)cache.set(p,ignored.has(p));
    }catch{
      if(saved===cache)for(const p of paths)cache.set(p,false);
    }finally{if(request===controller)request=null;schedule()}
  }
  function expire(){if(!document.hidden){cache=new Map();schedule()}}
  const timer=setInterval(expire,15000);
  window.addEventListener("focus",expire);
  createEffect(()=>{ctx.sessions?.current()?.directory;schedule()});
  return {schedule,stop(){
    disposed=true;cancelAnimationFrame(scheduled);request?.abort();clearInterval(timer);window.removeEventListener("focus",expire);
    for(const r of [document,...roots])r.querySelectorAll("[data-lp-ignored]").forEach(el=>el.removeAttribute("data-lp-ignored"));
  }};
}

exports.default=Plugin.define({
  stores:{prefs:Store.global(Schema.Struct({size:Schema.Number}),{size:14})},
  setup(ctx){
    if(ctx.app.platform!=="desktop")return;
    const prefs=ctx.stores.prefs, html=document.documentElement;
    ctx.add(Style,docCss);
    createEffect(()=>html.style.setProperty("--lp-nav-size",normalize(prefs.value.size)+"px"));
    ctx.add(SettingsPage,{
      id:"explorer",title:"Левая панель",icon:"folder",
      entries:[{id:"font-size",title:"Размер текста",keywords:"шрифт размер дерево файлы"}],
      render(){
        const label=document.createElement("label"), input=document.createElement("input"), value=document.createElement("output");
        label.style.cssText="display:flex;gap:12px;align-items:center";value.style.minWidth="4em";
        input.type="range";input.min="12";input.max="20";input.step="1";input.setAttribute("aria-label","Размер текста левой панели");
        input.oninput=()=>prefs.update(draft=>{draft.size=normalize(input.valueAsNumber)});
        createEffect(()=>{const n=normalize(prefs.value.size);input.value=String(n);value.textContent=n+" px"});
        label.append(input,value);
        return createComponent(ctx.ui.SettingsLayout,{title:"Левая панель",description:"One Dark Pro · VSCode Great Icons",get children(){
          return createComponent(ctx.ui.SettingsSection,{title:"Навигация",get children(){
            return createComponent(ctx.ui.SettingsRow,{id:"font-size",title:"Размер текста",description:"Дерево файлов, вкладки и поиск. По умолчанию — 14 px.",children:label});
          }});
        }});
      }
    });
    const sheet=new CSSStyleSheet();sheet.replaceSync(treeCss);
    const mounted=new Set();
    const ignores=ignoreDecorations(ctx,mounted), watches=new Map();
    function scan(){
      for(const root of mounted)if(!root.host.closest("#review-panel")){root.adoptedStyleSheets=root.adoptedStyleSheets.filter(s=>s!==sheet);mounted.delete(root);watches.get(root)?.disconnect();watches.delete(root)}
      for(const host of document.querySelectorAll("#review-panel "+treeHost)){
        const r=host.shadowRoot;
        if(r&&!mounted.has(r)){
          r.adoptedStyleSheets=[...r.adoptedStyleSheets,sheet];mounted.add(r);
          const watch=new MutationObserver(ignores.schedule);watch.observe(r,{subtree:true,childList:true,attributes:true,attributeFilter:["data-item-path"]});watches.set(r,watch);
        }
      }
      ignores.schedule();
    }
    let frame=0;
    const observer=new MutationObserver(records=>{
      if(frame)return;
      if(records.some(r=>r.target instanceof Element && (r.target.closest("#review-panel") ||
        [...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1 && (n.id==="review-panel"||n.querySelector("#review-panel")))))){
        frame=requestAnimationFrame(()=>{frame=0;scan()});
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-path","aria-hidden"]});
    scan();
    return ()=>{observer.disconnect();ignores.stop();for(const w of watches.values())w.disconnect();cancelAnimationFrame(frame);for(const root of mounted)root.adoptedStyleSheets=root.adoptedStyleSheets.filter(s=>s!==sheet);html.style.removeProperty("--lp-nav-size")};
  }
});
