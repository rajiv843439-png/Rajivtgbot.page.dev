/* Rajiv TG Bots — Supabase-backed directory and owner dashboard */
(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = Number(cfg.PAGE_SIZE) || 12;
  const state = {client:null,session:null,bots:[],categories:[],page:0,search:"",category:"",sort:"newest",editing:null,toastTimer:null};
  const els = {
    grid:$("botGrid"), empty:$("emptyState"), search:$("searchInput"), category:$("categoryFilter"),
    sort:$("sortFilter"), chips:$("categoryChips"), count:$("resultCount"), more:$("loadMore"),
    modal:$("adminModal"), login:$("loginForm"), workspace:$("adminWorkspace"), adminMsg:$("adminMessage"),
    adminList:$("adminBotList"), form:$("botForm"), formMsg:$("formMessage"), image:$("botImage")
  };

  function escapeHTML(value="") {
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function cleanUsername(value) {
    return String(value || "").trim().replace(/^https?:\/\/t\.me\//i,"").replace(/^@/,"").replace(/\/.*$/,"");
  }
  function toast(message) {
    const node=$("toast"); node.textContent=message; node.classList.add("show");
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>node.classList.remove("show"),2800);
  }
  function message(node,text,isError=false) {
    node.textContent=text; node.classList.toggle("error",Boolean(isError));
  }
  function ready() {
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
        cfg.SUPABASE_URL.includes("YOUR-PROJECT") || cfg.SUPABASE_ANON_KEY.includes("YOUR_")) {
      els.grid.innerHTML='<div class="loading-card">Database setup is not finished. Add your Supabase URL and anon key in <b>config.js</b>.</div>';
      $("statBots").textContent="0"; $("statCategories").textContent="0"; els.count.textContent="Database not configured";
      return false;
    }
    state.client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return true;
  }
  async function loadBots(reset=true) {
    if (!state.client) return;
    if (reset) {state.page=0;state.bots=[];}
    els.grid.innerHTML=state.bots.length?els.grid.innerHTML:'<div class="loading-card">Loading the directory…</div>';
    const from=state.page*PAGE_SIZE, to=from+PAGE_SIZE-1;
    let query=state.client.from("bots").select("id,name,username,category,description,tags,image_url,status,featured,clicks,created_at,updated_at")
      .eq("is_public",true);
    if(state.search) query=query.or(`name.ilike.%${state.search}%,username.ilike.%${state.search}%,description.ilike.%${state.search}%`);
    if(state.category) query=query.eq("category",state.category);
    if(state.sort==="az") query=query.order("name",{ascending:true});
    else if(state.sort==="popular") query=query.order("clicks",{ascending:false});
    else query=query.order("created_at",{ascending:false});
    const {data,error}=await query.range(from,to);
    if(error){els.grid.innerHTML='<div class="loading-card">Could not load bots. Check your Supabase tables and policies.</div>';els.count.textContent="Database error";console.error(error);return;}
    state.bots=reset?(data||[]):state.bots.concat(data||[]);
    renderBots(); state.page++;
    els.more.classList.toggle("hidden",(data||[]).length<PAGE_SIZE);
    updateStats();
  }
  function renderBots() {
    els.grid.innerHTML="";
    els.empty.classList.toggle("hidden",state.bots.length>0);
    state.bots.forEach(bot=>{
      const card=document.createElement("article");card.className="bot-card";
      const image=bot.image_url?`<img class="bot-avatar" src="${escapeHTML(bot.image_url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;bot-avatar&quot;>${escapeHTML((bot.name||"B").slice(0,1).toUpperCase())}</div>'">`:`<div class="bot-avatar">${escapeHTML((bot.name||"B").slice(0,1).toUpperCase())}</div>`;
      const tags=Array.isArray(bot.tags)?bot.tags:(typeof bot.tags==="string"?bot.tags.split(",").map(x=>x.trim()).filter(Boolean):[]);
      card.innerHTML=`<div class="card-top">${image}<div class="bot-title"><h3>${escapeHTML(bot.name)}</h3><span>@${escapeHTML(cleanUsername(bot.username))}</span></div>${bot.featured?'<span class="featured">✦ FEATURED</span>':""}</div>
      <p class="bot-description">${escapeHTML(bot.description)}</p><div class="card-meta"><span class="category-label">${escapeHTML(bot.category)}</span><span class="bot-status ${bot.status==="maintenance"?"maintenance":""}">${bot.status==="maintenance"?"● Maintenance":"● Active"}</span></div>
      ${tags.length?`<div class="tag-line">${tags.slice(0,4).map(t=>`<span class="category-label">${escapeHTML(t)}</span>`).join(" ")}</div>`:""}
      <div class="card-actions"><a class="button button-primary" href="https://t.me/${encodeURIComponent(cleanUsername(bot.username))}" target="_blank" rel="noopener" data-open-bot="${escapeHTML(bot.id)}">Open in Telegram ↗</a><button class="button button-outline" type="button" data-copy="${escapeHTML(cleanUsername(bot.username))}">Copy username</button></div>`;
      els.grid.appendChild(card);
    });
    els.count.textContent=`Showing ${state.bots.length} bot${state.bots.length===1?"":"s"}`;
  }
  async function updateStats() {
    const {count}=await state.client.from("bots").select("id",{count:"exact",head:true}).eq("is_public",true);
    $("statBots").textContent=count??state.bots.length;
    const {data}=await state.client.from("bots").select("category").eq("is_public",true);
    const unique=new Set((data||[]).map(x=>x.category));$("statCategories").textContent=unique.size;
  }
  async function loadCategories() {
    const {data,error}=await state.client.from("bot_categories").select("name").eq("enabled",true).order("sort_order");
    let categories=(data||[]).map(x=>x.name);
    if(error||!categories.length){const result=await state.client.from("bots").select("category").eq("is_public",true);categories=[...new Set((result.data||[]).map(x=>x.category))].sort();}
    state.categories=categories;
    els.category.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
    els.chips.innerHTML='<button class="category-chip active" data-category="">All</button>'+categories.map(c=>`<button class="category-chip" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
  }
  function subscribeRealtime() {
    state.client.channel("public-bots-live").on("postgres_changes",{event:"*",schema:"public",table:"bots"},()=>{loadCategories();loadBots(true);}).subscribe();
  }
  function openModal() {
    els.modal.classList.remove("hidden");message(els.adminMsg,"");
    state.client.auth.getSession().then(({data})=>{if(data.session)showWorkspace(data.session);});
  }
  function closeModal(){els.modal.classList.add("hidden");}
  async function showWorkspace(session) {
    state.session=session;els.login.classList.add("hidden");els.workspace.classList.remove("hidden");
    $("adminIdentity").textContent=session.user.email||"Admin";
    await loadAdminList();
  }
  async function loadAdminList() {
    const {data,error}=await state.client.from("bots").select("*").order("created_at",{ascending:false});
    if(error){els.adminList.textContent="Unable to load records. Verify admin access.";return;}
    els.adminList.innerHTML="";
    if(!data.length){els.adminList.textContent="No bots added yet.";return;}
    data.forEach(bot=>{
      const row=document.createElement("div");row.className="admin-row";
      row.innerHTML=`${bot.image_url?`<img src="${escapeHTML(bot.image_url)}" alt="">`:`<div class="mini-avatar">${escapeHTML((bot.name||"B").slice(0,1))}</div>`}
      <div class="admin-row-info"><strong>${escapeHTML(bot.name)}</strong><small>@${escapeHTML(cleanUsername(bot.username))} · ${escapeHTML(bot.category)} · ${bot.is_public?"Public":"Hidden"}</small></div>
      <button class="button button-outline" data-edit="${escapeHTML(bot.id)}">Edit</button><button class="button button-outline danger-button" data-delete="${escapeHTML(bot.id)}">Delete</button>`;
      els.adminList.appendChild(row);
    });
  }
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));
    $("manageTab").classList.toggle("hidden",name!=="manage");$("addTab").classList.toggle("hidden",name!=="add");
  }
  function resetForm() {
    els.form.reset();$("editId").value="";$("saveBotBtn").textContent="Save bot";$("imagePreview").classList.add("hidden");
    $("imagePreview").innerHTML="";state.editing=null;message(els.formMsg,"");
  }
  async function editBot(id) {
    const {data,error}=await state.client.from("bots").select("*").eq("id",id).single();
    if(error){toast("Could not open this bot.");return;}
    state.editing=data;$("editId").value=data.id;$("botName").value=data.name;$("botUsername").value=data.username;
    $("botCategory").value=data.category;$("botStatus").value=data.status;$("botDescription").value=data.description;
    $("botTags").value=Array.isArray(data.tags)?data.tags.join(", "):(data.tags||"");$("botFeatured").checked=!!data.featured;
    if(data.image_url){$("imagePreview").innerHTML=`<img src="${escapeHTML(data.image_url)}" alt="Current image">`; $("imagePreview").classList.remove("hidden");}
    $("saveBotBtn").textContent="Update bot";switchTab("add");
  }
  async function uploadImage(file) {
    if(!file)return {url:state.editing?.image_url||null,path:state.editing?.image_path||null};
    const allowed=["image/jpeg","image/png","image/webp"];
    if(!allowed.includes(file.type))throw new Error("Use JPG, PNG or WEBP image.");
    if(file.size>5*1024*1024)throw new Error("Image must be 5 MB or smaller.");
    const ext=file.name.split(".").pop().toLowerCase();const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await state.client.storage.from(cfg.IMAGE_BUCKET||"bot-images").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=state.client.storage.from(cfg.IMAGE_BUCKET||"bot-images").getPublicUrl(path);
    return {url:data.publicUrl,path};
  }
  async function saveBot(event) {
    event.preventDefault();const btn=$("saveBotBtn");btn.disabled=true;message(els.formMsg,"Saving…");
    try {
      const username=cleanUsername($("botUsername").value);
      if(!/^[A-Za-z0-9_]{5,32}$/.test(username))throw new Error("Enter a valid Telegram bot username.");
      const uploaded=await uploadImage(els.image.files[0]);
      const payload={name:$("botName").value.trim(),username,category:$("botCategory").value,
        description:$("botDescription").value.trim(),tags:$("botTags").value.split(",").map(x=>x.trim()).filter(Boolean),
        status:$("botStatus").value,featured:$("botFeatured").checked,image_url:uploaded.url,image_path:uploaded.path,
        is_public:true,updated_at:new Date().toISOString(),created_by:state.session.user.id};
      if(!payload.name||!payload.description)throw new Error("Name and description are required.");
      let result;
      if($("editId").value)result=await state.client.from("bots").update(payload).eq("id",$("editId").value);
      else result=await state.client.from("bots").insert(payload);
      if(result.error)throw result.error;
      toast($("editId").value?"Bot updated successfully.":"Bot added successfully.");
      resetForm();await loadAdminList();await loadCategories();await loadBots(true);switchTab("manage");
    } catch(err){message(els.formMsg,err.message||"Something went wrong.",true);}
    finally{btn.disabled=false;}
  }
  async function deleteBot(id) {
    if(!confirm("Delete this bot listing? This cannot be undone."))return;
    const {data,error}=await state.client.from("bots").select("image_path").eq("id",id).single();
    if(error){toast("Could not find bot.");return;}
    const {error:delError}=await state.client.from("bots").delete().eq("id",id);
    if(delError){toast(delError.message);return;}
    if(data.image_path)await state.client.storage.from(cfg.IMAGE_BUCKET||"bot-images").remove([data.image_path]);
    toast("Bot deleted.");await loadAdminList();await loadBots(true);await loadCategories();
  }
  async function logout() {
    await state.client.auth.signOut();state.session=null;els.workspace.classList.add("hidden");els.login.classList.remove("hidden");els.login.reset();message(els.adminMsg,"Signed out.");
  }
  function bind() {
    $("year").textContent=new Date().getFullYear();
    $("adminOpen").addEventListener("click",openModal);
    els.modal.addEventListener("click",e=>{if(e.target.dataset.close==="true")closeModal();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
    els.search.addEventListener("input",()=>{state.search=els.search.value.trim().replace(/[(),]/g," ");loadBots(true);});
    els.category.addEventListener("change",()=>{state.category=els.category.value;syncChips();loadBots(true);});
    els.sort.addEventListener("change",()=>{state.sort=els.sort.value;loadBots(true);});
    els.chips.addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;state.category=b.dataset.category;els.category.value=state.category;syncChips();loadBots(true);});
    $("clearFilters").addEventListener("click",()=>{state.search="";state.category="";els.search.value="";els.category.value="";syncChips();loadBots(true);});
    els.more.addEventListener("click",()=>loadBots(false));
    els.grid.addEventListener("click",async e=>{
      const open=e.target.closest("[data-open-bot]");if(open){return;}
      const copy=e.target.closest("[data-copy]");if(copy){try{await navigator.clipboard.writeText("@"+copy.dataset.copy);toast("Username copied.");}catch{toast("@"+copy.dataset.copy);}}
    });
    els.login.addEventListener("submit",async e=>{e.preventDefault();message(els.adminMsg,"Signing in…");const {data,error}=await state.client.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});if(error){message(els.adminMsg,error.message,true);return;}await showWorkspace(data.session);});
    $("logoutBtn").addEventListener("click",logout);
    document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
    els.form.addEventListener("submit",saveBot);$("resetBotForm").addEventListener("click",resetForm);
    els.adminList.addEventListener("click",e=>{const edit=e.target.closest("[data-edit]");const del=e.target.closest("[data-delete]");if(edit)editBot(edit.dataset.edit);if(del)deleteBot(del.dataset.delete);});
    els.image.addEventListener("change",()=>{const f=els.image.files[0];if(!f)return;const url=URL.createObjectURL(f);$("imagePreview").innerHTML=`<img src="${url}" alt="Selected image">`;$("imagePreview").classList.remove("hidden");});
    state.client.auth.onAuthStateChange((_event,session)=>{state.session=session;});
  }
  function syncChips(){els.chips.querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===state.category));}
  async function init(){
    if(!ready())return;
    bind();
    const {data}=await state.client.auth.getSession();if(data.session)state.session=data.session;
    await loadCategories();await loadBots(true);subscribeRealtime();
  }
  document.addEventListener("DOMContentLoaded",init);
})();
