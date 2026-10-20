(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const data = window.FASHION_TALK;
  const slides = $$('.slide');
  const pad = n => String(n).padStart(2, '0');
  let current = -1, task = 'rebuild', sceneDirty = false, shotPlan = null, selectedShot = 'S04', notesOpen = false;
  const notify = message => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('show'), 3500); };
  const download = (value, name, mime = 'text/plain;charset=utf-8') => { const url = URL.createObjectURL(new Blob([value], {type:mime})); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const copy = async id => { const e = document.getElementById(id); try { await navigator.clipboard.writeText(e.value); notify('已复制，请按提示词附上对应参考图。'); } catch { e.focus(); e.select(); notify('请复制已选中的文字。'); } };
  function setMotion(off, save = true) { off ||= matchMedia('(prefers-reduced-motion: reduce)').matches; document.documentElement.dataset.motion = off ? 'off' : 'on'; $('#toggle-motion').setAttribute('aria-pressed', String(off)); $('#toggle-motion').textContent = off ? '启用动效' : '减少动效'; if(save) try { localStorage.setItem('humen-editorial-motion', off ? 'off' : 'on'); } catch {} document.dispatchEvent(new CustomEvent('fashion:motion')); }
  let motionOff = matchMedia('(prefers-reduced-motion: reduce)').matches; try { motionOff ||= localStorage.getItem('humen-editorial-motion') === 'off'; } catch {} setMotion(motionOff, false);
  function go(n, hash = true) {
    n=Math.max(0,Math.min(slides.length-1,Number(n)));
    if(n===current){if(hash&&location.hash!=='#'+pad(n+1))history.pushState(null,'','#'+pad(n+1));return;}
    slides.forEach((s,i)=>{s.hidden=i!==n;s.inert=i!==n;s.classList.toggle('active',i===n);});current=n;
    if(hash)history.pushState(null,'','#'+pad(n+1));
    $('#page-indicator').textContent=pad(n+1)+' / '+pad(slides.length);$('#progress-fill').style.width=((n+1)/slides.length*100)+'%';
    $('#prev-slide').disabled=n===0;$('#next-slide').disabled=n===slides.length-1;$('#note-text').textContent=data.pages[n][2];
    $$('#directory-list button').forEach((b,i)=>b.setAttribute('aria-current',String(i===n)));
    const chapters=$$('.chapters button');chapters.forEach((b,i)=>b.setAttribute('aria-current',String(Number(b.dataset.go)<=n && n<(Number(chapters[i+1]?.dataset.go)||slides.length))));
    if(slides[n].classList.contains('showroom-slide')&&!$('#wardrobe').src)$('#wardrobe').src=$('#wardrobe').dataset.src;
    $('#stage').focus({preventScroll:true});document.dispatchEvent(new CustomEvent('fashion:page',{detail:{index:n}}));
  }
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>setMotion(e.matches,false));
  const hashPage=()=>{const key=location.hash.slice(1),route=window.FASHION_COURSE_ROUTES?.[key];if(Number.isInteger(route))return route;const n=Number(key);return Number.isInteger(n)&&n>=1&&n<=slides.length?n-1:0;};
  window.addEventListener('hashchange',()=>go(hashPage(),false)); window.addEventListener('popstate',()=>go(hashPage(),false));
  function showDialog(id, opener) { const d=document.getElementById(id); d._opener=opener; d.showModal(); }
  $$('dialog.modal').forEach(d=>{d.addEventListener('close',()=>d._opener?.focus()); d.addEventListener('click',e=>{if(e.target===d)d.close();}); $('.modal-close',d).addEventListener('click',()=>d.close());});
  $('#directory-list').innerHTML=data.pages.map((p,i)=>`<li><button data-go="${i}"><span>${pad(i+1)}</span>${p[0]}</button></li>`).join('');
  $('#directory-count').textContent=`DIRECTORY / ${slides.length} SCREENS`;
  $('#open-directory').addEventListener('click',e=>showDialog('directory',e.currentTarget));
  $('#prev-slide').addEventListener('click',()=>go(current-1)); $('#next-slide').addEventListener('click',()=>go(current+1));
  function toggleNotes(force) { notesOpen = force ?? !notesOpen; $('#notes-panel').hidden=!notesOpen; $('#open-notes').setAttribute('aria-pressed',String(notesOpen)); }
  $('#open-notes').addEventListener('click',()=>toggleNotes()); $('#close-notes').addEventListener('click',()=>toggleNotes(false));
  $('#toggle-motion').addEventListener('click',()=>setMotion(document.documentElement.dataset.motion!=='off'));
  $('#fullscreen').addEventListener('click',async()=>{try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {notify('此环境无法进入全屏。');}});
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||$('dialog[open]'))return;if(e.key==='Escape'&&notesOpen){toggleNotes(false);return;}if(e.target.closest('input,textarea,select,[contenteditable]'))return; if(['ArrowRight','PageDown'].includes(e.key)||(e.code==='Space'&&!e.target.closest('button,a'))){e.preventDefault();go(current+1);}else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(current-1);}else if(e.key==='Home'){go(0);}else if(e.key==='End'){go(slides.length-1);}else if(e.key.toLowerCase()==='n'){toggleNotes();}else if(e.key.toLowerCase()==='f'){$('#fullscreen').click();}});
  function selectOne(button, selector, attr='aria-pressed') { $$(selector).forEach(b=>{const on=b===button;b.setAttribute(attr,String(on));if(attr==='aria-selected')b.tabIndex=on?0:-1;}); }
  $$('.task-tabs, .small-tabs').forEach(tabs=>tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const list=$$('[role=tab]',tabs), at=list.indexOf(document.activeElement);if(at<0)return;e.preventDefault();const to=e.key==='Home'?0:e.key==='End'?list.length-1:(at+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;list[to].focus();list[to].click();}));
  const taskDrafts=new Map();let taskDirty=false,taskPending=false;
  function taskControls(){ $('#task-dirty').hidden=!taskPending;$('#rebuild-task').hidden=!taskPending; }
  function taskPrompt(force=false) {
    if(taskDirty&&!force){taskPending=true;taskControls();return;}
    taskDirty=false;taskPending=false;taskControls();
    $('#task-prompt').value=data.tasks[task][3]+'\n本轮补充：'+$('#task-extra').value.trim();
  }
  function changeTask(next){
    taskDrafts.set(task,{extra:$('#task-extra').value,prompt:$('#task-prompt').value,dirty:taskDirty,pending:taskPending});
    task=next;const value=data.tasks[task],draft=taskDrafts.get(task);
    $('#task-title').textContent=value[0];$('#task-caption').textContent=value[1];
    $('#task-extra').value=draft?.extra??value[2];taskDirty=draft?.dirty??false;taskPending=draft?.pending??false;
    if(draft){$('#task-prompt').value=draft.prompt;taskControls();}else taskPrompt();
  }
  taskPrompt();$('#task-extra').addEventListener('input',()=>taskPrompt());
  $('#task-prompt').addEventListener('input',()=>{taskDirty=true;});
  $('#rebuild-task').addEventListener('click',()=>taskPrompt(true));
  function scenePrompt(force=false) { if(sceneDirty&&!force){$('#scene-dirty').hidden=false;$('#rebuild-scene').hidden=false;return;} sceneDirty=false;$('#scene-dirty').hidden=true;$('#rebuild-scene').hidden=true;$('#scene-prompt').value=`图1是银灰挂脖上衣概念参考，控制深V领、几何拼接与宽腰段。图2是已确定的原创成年女性母图，控制面部身份与发型。图3是已检查的整套穿搭图，控制黑色九分微喇裤和细带夹趾凉鞋。已确认的自然光主图仅用于延续摄影气氛，不替代前述参考。\n场景：${$('#scene-location').value.trim()}。\n动作：${$('#scene-action').value.trim()}。\n取景：${$('#scene-framing').value.trim()}。\n光线：${$('#scene-light').value.trim()}。\n一张真实感时装杂志照片。保持同一成年人物、同一套服装，皮肤与布料自然；不新增首饰、文字、水印或其他人物。生成后人工核对身份、服装结构、裤长、凉鞋与光影。`; }
  $('#scene-form').addEventListener('submit',e=>e.preventDefault()); $('#scene-form').addEventListener('input',()=>scenePrompt()); $('#scene-prompt').addEventListener('input',()=>{sceneDirty=true;}); $('#rebuild-scene').addEventListener('click',()=>scenePrompt(true)); scenePrompt();
  const promptDrafts=new Map();let promptKey=null;
  function openPrompt(key, opener) { promptKey=key;const p=data.prompts[key]; $('#prompt-title').textContent=p[0]; $('#prompt-description').textContent=key==='face'?'此独立换脸任务仍待实际执行。上传参考仅在本页准备输入。':key==='tryon'?'上传新图后需带新输入重新生成，旧结果不会自动更新。':'带上对应参考图再执行，并检查实际输出。'; $('#modal-prompt').value=promptDrafts.get(key)??p[1]; showDialog('prompt-dialog',opener); }
  $('#modal-prompt').addEventListener('input',()=>{if(promptKey)promptDrafts.set(promptKey,$('#modal-prompt').value);});
  $('#reset-prompt').addEventListener('click',()=>{if(promptKey){promptDrafts.delete(promptKey);$('#modal-prompt').value=data.prompts[promptKey][1];notify('已恢复默认提示词。');}});
  function review() { const labels=$$('.checklist label'); const s='# 女装生成图人工检查清单\n\n'+labels.map(l=>`${$('input',l).checked?'[x]':'[ ]'} ${l.textContent.trim()}`).join('\n')+'\n\n勾选只表示人工查看，不代表自动通过；请另记实际偏差。\n'; download(s,'女装图人工检查清单.md'); notify('检查清单已下载。'); }
  $('#save-review').addEventListener('click',review); $$('.checklist input').forEach(i=>i.addEventListener('change',()=>$('#review-count').textContent=$$('.checklist input:checked').length+' / 4'));
  function makeShotPrompt(s) {
    const continuity=s.subject==='garment'?'无人出镜的静物服装插镜；保持银灰面料、挂脖领带、几何拼接和腰段。不要人物或人体模型。':s.subject==='architecture'?'无人出镜的建筑环境镜头；保持石材建筑、铁艺与自然光一致。':'自然时装短片；保持同一成年人物、银灰挂脖上衣、黑色九分微喇裤和细带凉鞋一致。';
    return `模型：MiniMax-H3-Max\n镜头：${s.id} ${s.title}\n首帧：${s.first_frame_asset??'尚需准备'}${s.last_frame_asset?'\n尾帧：'+s.last_frame_asset:''}\n输入模式：${s.last_frame_asset?'首帧 + 尾帧':'首帧'}。\n画面：${s.framing}。\n动作：${s.action}。\n${continuity}\n无变形、文字、水印或突然转场。\n目标剪辑时长：${s.edit_duration_seconds ?? s.edit}秒；请求生成时长按服务商实际支持配置。逐镜核对首中尾帧。`;
  }
  const localVideos = new Map(), uploadURLs = new Map();
  $('.video-preview').append($('#video-player'));
  const mainBadge=document.createElement('span');mainBadge.className='video-badge';mainBadge.textContent='MiniMax-H3-Max 实际生成 · 5s';
  const mainPlay=document.createElement('button');mainPlay.type='button';mainPlay.className='video-play';mainPlay.textContent='播放 ▶';mainPlay.setAttribute('aria-label','播放当前镜头');
  mainPlay.addEventListener('click',()=>$('#video-player').play().catch(()=>{}));
  $('.video-preview').append(mainBadge,mainPlay);
  const shotPrompts = new Map();
  let selectedView='video';
  $('#shot-prompt').addEventListener('input', () => shotPrompts.set(selectedShot, $('#shot-prompt').value));
  function showLocalVideo() {
    const actual=window.fashionGallery.available.find(x=>x.group==='video'&&x.shot===selectedShot);
    const entry = localVideos.get(selectedShot) || (actual ? {url:actual.path,actual:true,poster:actual.poster}:null), v = $('#video-player');
    const s=shotPlan?.shots.find(s=>s.id===selectedShot);if(!s)return;
    if((selectedView==='video'&&!entry)||(selectedView==='last'&&!s.last_frame_asset))selectedView='first';
    const showVideo=selectedView==='video'&&Boolean(entry),path=selectedView==='last'?s.last_frame_asset:s.first_frame_asset;
    v.pause();$('.video-preview').classList.remove('is-playing');v.hidden = !showVideo; $('#local-video').value = '';
    const image=$('#shot-preview');image.hidden=showVideo||!path;
    if(path){image.src=path;image.alt=`${selectedShot} ${s.title}的${selectedView==='last'?'尾帧':'首帧'}输入`;image.dataset.galleryId=selectedShot+'-'+(selectedView==='last'?'last':'first');image.setAttribute('role','button');image.tabIndex=0;}
    else{image.removeAttribute('src');delete image.dataset.galleryId;image.removeAttribute('role');image.removeAttribute('tabindex');}
    $('#shot-preview-status').textContent=`${selectedShot} · ${selectedView==='last'?'静态尾帧 · 输入参考':frameStatus(s)}`;
    $$('#shot-views button').forEach(button=>{const view=button.dataset.shotView;button.disabled=view==='video'?!entry:view==='last'?!s.last_frame_asset:!s.first_frame_asset;button.setAttribute('aria-pressed',String(!button.disabled&&view===selectedView));});
    $('#remove-local-video').hidden=!localVideos.has(selectedShot);
    if (entry) { v.src = entry.url;if(entry.poster)v.poster=entry.poster;else v.removeAttribute('poster'); }
    else { v.removeAttribute('src');v.removeAttribute('poster'); }
    v.muted=true;v.loop=true;
    v.toggleAttribute('data-autoplay',Boolean(entry?.actual));
    mainBadge.hidden=!entry?.actual||!showVideo;mainPlay.hidden=!entry||!showVideo;
    v.load();
    document.dispatchEvent(new CustomEvent('fashion:media'));
    $('#video-note').textContent = showVideo
      ? entry.actual ? `${selectedShot} · MiniMax-H3-Max 实际生成 · 768P · 5 秒` : `${selectedShot} · 本地导入：${entry.name}。仅在此浏览器预览。`
      : `${selectedShot} · ${selectedView==='last'?'尾帧':'首帧'}输入参考${entry?' · 可切换动态成片':' · 视频尚未生成'}`;
  }
  $$('#shot-views button').forEach(button=>button.addEventListener('click',()=>{selectedView=button.dataset.shotView;showLocalVideo();}));
  $('#remove-local-video').addEventListener('click',()=>{const old=localVideos.get(selectedShot);if(old)URL.revokeObjectURL(old.url);localVideos.delete(selectedShot);selectedView='video';showLocalVideo();});
  function frameStatus(s) {
    return !s.first_frame_asset ? '首帧待演练' : s.status.includes('review_pending') ? '静态首帧 · 待连续性复核' : '静态首帧 · 目视通过';
  }
  function showShot(id) {
    if (!shotPlan) return;
    const s = shotPlan.shots.find(x => x.id === id); if (!s) return;
    selectedShot = id;
    selectedView='video';
    $$('#shot-list button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shot === id)));
    $('#shot-preview-title').textContent = s.title;
    $('#shot-risk').textContent = '风险 / ' + s.risk;
    $('#shot-action').textContent = s.action;
    $('#shot-prompt').value = shotPrompts.get(id) ?? makeShotPrompt(s);
    const asset = s.first_frame_asset, img = $('#shot-preview'); img.hidden = !asset;
    if (asset) { img.src = asset; img.alt = `${id} ${s.title}的静态首帧输入参考`;img.dataset.galleryId=id+'-first';img.setAttribute('role','button');img.tabIndex=0; }
    else {img.removeAttribute('src');delete img.dataset.galleryId;img.removeAttribute('role');img.removeAttribute('tabindex');}
    const actual=window.fashionGallery.available.some(x=>x.group==='video'&&x.shot===id);
    $('#shot-preview-status').textContent = id + ' · ' + frameStatus(s) + (actual?' / MiniMax-H3-Max 实际生成':' / 视频待生成');
    showLocalVideo();
  }
  async function loadShots() {
    try {
      const r = await fetch('docs/female-editorial-shot-plan.json', {cache:'no-store'});
      if (!r.ok) throw Error('HTTP ' + r.status);
      shotPlan = await r.json();
      if(shotPlan.production_sequence)shotPlan.shots=shotPlan.production_sequence.map(id=>shotPlan.shots.find(s=>s.id===id)).filter(Boolean);
      await window.fashionGallery.ready;
      $('#shot-list').replaceChildren();
      for(const s of shotPlan.shots){
        const first=window.fashionGallery.available.find(x=>x.group==='shot'&&x.shot===s.id&&x.frame==='first');
        const last=window.fashionGallery.available.find(x=>x.group==='shot'&&x.shot===s.id&&x.frame==='last');
        const actual=window.fashionGallery.available.find(x=>x.group==='video'&&x.shot===s.id);
        s.first_frame_asset=first?.path;
        s.last_frame_asset=last?.path;
        if(actual){s.status='video_generated';s.video_asset=actual.path;s.poster_asset=actual.poster;if(actual.task_id)s.task_id=actual.task_id;}
        const b=document.createElement('button');b.dataset.shot=s.id;b.setAttribute('aria-pressed','false');
        if(first){const image=document.createElement('img');image.src=first.path;image.alt=first.title;image.loading='lazy';image.decoding='async';b.append(image);}
        if(actual){const video=document.createElement('video');video.src=actual.path;video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';video.dataset.autoplay='';if(actual.poster)video.poster=actual.poster;video.setAttribute('aria-label',s.id+' 实际生成视频');b.append(video);b.classList.add('has-video');
          b.addEventListener('click',()=>{requestAnimationFrame(()=>{video.play().catch(()=>{});$('#video-player').play().catch(()=>{});});});
        }
        const title=document.createElement('span');title.textContent=s.title;
        const id=document.createElement('b');id.textContent=s.id;
        const status=document.createElement('small');status.textContent=actual?'MiniMax-H3-Max 实际生成 · 5s':first?'首帧已生成 / 视频待生成':'待生成';
        b.append(id,title,status);$('#shot-list').append(b);
      }
      showShot(selectedShot);
      document.dispatchEvent(new CustomEvent('fashion:shots-ready'));
    } catch { notify('三镜数据未能载入。'); $('#shot-list').textContent = '三镜任务清单载入失败，请刷新页面。'; }
  }
  $('#download-shot-plan').addEventListener('click', () => {
    if (!shotPlan) return notify('分镜数据仍在载入。');
    // Export only public task fields. Credentials and arbitrary metadata never enter downloads.
    const fields = ['id','title','subject','framing','action','risk','generation_duration_seconds','edit_duration_seconds','status','model','resolution','aspect_ratio','first_frame_asset','last_frame_asset','video_asset','poster_asset','task_id'];
    const clean = {model:shotPlan.model, api_calls_submitted:window.FASHION_GALLERY.apiCalls, generated_video_count:window.fashionGallery.available.filter(x=>x.group==='video').length,
      shots:shotPlan.shots.map(s => ({...Object.fromEntries(fields.filter(k => s[k] !== undefined).map(k => [k,s[k]])), prompt:shotPrompts.get(s.id) ?? makeShotPrompt(s)}))};
    download(JSON.stringify(clean,null,2),'三镜视频任务清单.json','application/json;charset=utf-8');
    notify('三镜任务清单已下载；未提交生成。');
  });
  $('#local-video').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^video\//.test(f.type)) { notify('请选择视频文件。'); e.target.value=''; return; }
    const old = localVideos.get(selectedShot); if (old) URL.revokeObjectURL(old.url);
    localVideos.set(selectedShot,{url:URL.createObjectURL(f),name:f.name});
    selectedView='video';
    showLocalVideo();
  });
  $('#video-player').addEventListener('error', () => {
    if (localVideos.has(selectedShot)) $('#video-note').textContent = `${selectedShot} · 此本地视频无法解码，请改用浏览器支持的 MP4。未生成新视频。`;
  });
  const inputs = [
    ['face-target','face-target-name','.face-images figure:nth-child(1)','待编辑人物'],
    ['face-identity','face-identity-name','.face-images figure:nth-child(2)','指定身份'],
    ['tryon-garment-file','tryon-garment-name','.tryon-inputs figure:nth-child(1)','服装参考'],
    ['tryon-model-file','tryon-model-name','.tryon-inputs figure:nth-child(2)','人物参考']
  ];
  for (const [id,label,selector,role] of inputs) {
    $('#'+id).addEventListener('change', e => {
      const f=e.target.files[0]; if(!f)return;
      if(!/^image\//.test(f.type)||f.size>20*1024*1024){e.target.value='';notify('请选择不超过 20MB 的图片。');return;}
      const previous=uploadURLs.get(id); if(previous)URL.revokeObjectURL(previous);
      const url=URL.createObjectURL(f); uploadURLs.set(id,url);
      const figure=$(selector), img=$('img',figure);
      img.src=url; img.alt=`输入 / ${role}：${f.name}`;
      $('figcaption',figure).textContent=`输入 / ${role} · ${f.name}`;
      $('#'+label).textContent='输入：'+f.name;
      if(id.startsWith('tryon')){
        const result=$('.tryon-result');result.classList.add('stale');
        $('figcaption',result).textContent='旧输入的静态结果 · 新参考仍待重新生成';
        $('#tryon-upload-status').textContent='输入已更新。当前结果只对应旧参考；请带新图重新生成并检查。';
      }
    });
  }
  window.addEventListener('pagehide',()=>{
    for(const entry of localVideos.values())URL.revokeObjectURL(entry.url);
    for(const url of uploadURLs.values())URL.revokeObjectURL(url);
  });
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.go!==undefined){const d=b.closest('dialog');if(d)d.close();go(Number(b.dataset.go));} if(b.dataset.copy)copy(b.dataset.copy);if(b.dataset.download){download(document.getElementById(b.dataset.download).value,'服装AI提示词.txt');notify('提示词已下载。');}if(b.dataset.prompt)openPrompt(b.dataset.prompt,b);if(b.dataset.basic){selectOne(b,'[data-basic]');const v=data.basics[b.dataset.basic];$('#basic-answer').textContent=v[0];$('#basic-result').textContent=v[1];}if(b.dataset.reference){selectOne(b,'[data-reference]');const v=data.references[b.dataset.reference];$('#reference-number').textContent=v[0];$('#reference-title').textContent=v[1];$('#reference-description').textContent=v[2];}if(b.dataset.task){selectOne(b,'[data-task]','aria-selected');changeTask(b.dataset.task);}if(b.dataset.flow!==undefined){selectOne(b,'[data-flow]');$('#flow-description').textContent=data.flow[Number(b.dataset.flow)];}if(b.dataset.check){selectOne(b,'[data-check]');const v=data.checks[b.dataset.check];$('#qa-reference').src=v[0];$('#qa-caption').textContent=v[1];$('#qa-description').textContent=v[2];}if(b.dataset.shot)showShot(b.dataset.shot);});
  $$('[data-type]').forEach(el => {
    el.setAttribute('aria-label',el.textContent.trim());
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    let i=0;
    for(const node of nodes){const fragment=document.createDocumentFragment();
      // Explicit break opportunities survive animated inline blocks. Closing
      // punctuation travels with the preceding character, never on its own line.
      const tokens=node.textContent.match(/[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*|[^\sA-Za-z0-9][，。！？、；：）》」』】…]*|\s+/gu)||[];
      for(const c of tokens){const span=document.createElement('span');span.className='type-char';span.textContent=c;span.setAttribute('aria-hidden','true');span.style.setProperty('--letter',i++);fragment.append(span,document.createElement('wbr'));}
      node.replaceWith(fragment);
    }
  });
  window.fashionExport=()=>({
    title:'虎门服装 AI · 本次提示词与素材清单',version:1,
    instructions:'图片角色按各条目 inputs/refs 使用；此清单不提交生成。上传文件仅在当前浏览器预览。',
    prompts:Object.entries(data.prompts).map(([key,value])=>({id:key,title:value[0],prompt:promptDrafts.get(key)??value[1]})),
    garment_tasks:Object.entries(data.tasks).map(([key,value])=>({id:key,title:value[0],prompt:key===task?$('#task-prompt').value:taskDrafts.get(key)?.prompt??value[3]})),
    scene_prompt:$('#scene-prompt').value,
    shots:shotPlan?.shots.map(s=>({id:s.id,title:s.title,status:s.status,subject:s.subject,first_frame_asset:s.first_frame_asset,last_frame_asset:s.last_frame_asset,prompt:shotPrompts.get(s.id)??makeShotPrompt(s)}))??[],
    assets:window.fashionGallery.available.map(({id,group,path,refs})=>({id,group,path,refs}))
  });
  go(hashPage(),false);loadShots();
})();
