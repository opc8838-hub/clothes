(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const catalogue = window.FASHION_GALLERY;
  const ease = 'cubic-bezier(.2,.7,.1,1)';
  const reduced = () => document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const worker = new Worker(new URL('gallery-probe.js', document.currentScript.src));
  let serial=0;
  const pending = new Map(), requests = new Map();
  worker.onmessage = ({data}) => {pending.get(data.id)?.(data); pending.delete(data.id);};
  worker.onerror = () => { for (const resolve of pending.values()) resolve({ok:false}); pending.clear(); };
  const inspect = (path, json=false) => {
    const key = (json?'json:':'head:')+path;
    if (!requests.has(key)) requests.set(key,new Promise(resolve => {
      const id=++serial;
      const timer=setTimeout(()=>{pending.delete(id);resolve({ok:false});},12000);
      pending.set(id,value=>{clearTimeout(timer);resolve(value);});
      worker.postMessage({id,url:new URL(path,document.baseURI).href,json});
    }));
    return requests.get(key);
  };
  const decode = (path, video=false) => new Promise(resolve => {
    const media = video ? document.createElement('video') : new Image();
    const timer = setTimeout(()=>finish(false),video?45000:20000);
    function finish(ok) {
      clearTimeout(timer); media.onload=media.onerror=media.onloadedmetadata=null;
      if(video){media.removeAttribute('src');media.load();}
      resolve(ok);
    }
    media.onerror=()=>finish(false);
    if(video){media.preload='metadata'; media.onloadedmetadata=()=>finish(media.videoWidth>0 && media.duration>0);}
    else {media.decoding='async';media.onload=()=>finish(media.naturalWidth>0);}
    media.src=path;
  });
  const safeRef = (input, metadata) => {
    const raw = (typeof input==='string' ? input : input?.path)?.replaceAll('\\','/');
    if(!raw || /^(?:[a-z]+:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(raw)) return null;
    const path = raw.startsWith('assets/') ? raw : metadata.slice(0,metadata.lastIndexOf('/')+1)+raw;
    return /^assets\/[^?#]+\.(png|jpe?g|webp|avif)$/i.test(path) ? path : null;
  };
  async function probe(entry) {
    for (const path of entry.candidates || [entry.path]) {
      if((await inspect(path)).ok && await decode(path,entry.group==='video'||entry.group==='film')) {
        const metadata=path.replace(/\.(png|mp4)$/i,'.json');
        const result=await inspect(metadata,true);
        const refs=result.ok ? (Array.isArray(result.value?.inputs)?result.value.inputs:[]).map(v=>safeRef(v,metadata)).filter(Boolean) : entry.refs;
        const verifiedRefs=[];
        for(const ref of [...new Set(refs)]) if((await inspect(ref)).ok && await decode(ref)) verifiedRefs.push(ref);
        let poster=null;
        if(entry.poster && (await inspect(entry.poster)).ok && await decode(entry.poster)) poster=entry.poster;
        return {...entry,path,metadata,refs:verifiedRefs,poster,status:'available'};
      }
    }
    return {...entry,status:'missing'};
  }
  const state = window.fashionGallery = {items:[], available:[], ready:null};
  state.ready = (async()=>{
    // Six media decoders at once keep the initial load bounded on small devices.
    let next=0; const results=new Array(catalogue.items.length);
    await Promise.all(Array.from({length:6},async()=>{
      while(next<catalogue.items.length){const i=next++;results[i]=await probe(catalogue.items[i]);}
    }));
    state.items=results; state.available=results.filter(x=>x.status==='available');
    catalogue.items=results;
    render(); worker.terminate();
    document.dispatchEvent(new CustomEvent('gallery:ready'));
    return state.available;
  })();
  function img(entry) {
    const image=document.createElement('img');
    image.src=entry.path;image.alt=entry.title;image.loading='lazy';image.decoding='async';
    return image;
  }
  function media(entry, lightbox=true) {
    const button=document.createElement(lightbox?'button':'div');
    button.className='media-frame';
    if(lightbox){button.type='button';button.dataset.galleryId=entry.id;button.setAttribute('aria-label','放大查看：'+entry.title);}
    const visual=document.createElement('span');visual.className='media-visual';visual.append(img(entry));button.append(visual);
    if(lightbox){const hint=document.createElement('span');hint.className='media-hint';hint.textContent='查看大图 ↗';button.append(hint);}
    return button;
  }
  function references(refs, target) {
    target.replaceChildren();
    for(const [i,path] of refs.entries()) {
      const button=document.createElement('button');button.type='button';button.className='reference-thumb';
      button.setAttribute('aria-label',`放大参考输入 ${i+1}`);button.dataset.refPath=path;
      const image=img({path,title:`参考输入 ${i+1}`});button.append(image);target.append(button);
    }
  }
  function card(entry, index) {
    const figure=document.createElement('figure');figure.className='gallery-card';figure.dataset.assetId=entry.id;
    figure.dataset.reveal='';figure.style.setProperty('--stagger',Math.min(index,5)*65+'ms');
    figure.append(media(entry));
    const caption=document.createElement('figcaption');
    const title=document.createElement('h3');title.textContent=entry.title;
    const desc=document.createElement('p');desc.textContent=entry.description;
    caption.append(title,desc);figure.append(caption);
    if(entry.group==='life'){
      const details=document.createElement('details');details.className='gallery-references';
      const summary=document.createElement('summary');summary.textContent=`参考 → 成片 · ${entry.refs.length} 张输入`;
      const strip=document.createElement('div');strip.className='reference-strip';
      references(entry.refs,strip);details.append(summary,strip);
      if(!entry.refs.length){const note=document.createElement('p');note.textContent='此图元数据未记录站内参考输入。';details.append(note);}
      figure.append(details);
    }
    return figure;
  }
  const videoLabel='MiniMax-H3-Max 实际生成 · 5s';
  function videoCard(entry){
    const frame=document.createElement('div');frame.className='actual-video';
    const video=document.createElement('video');video.src=entry.path;video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';video.dataset.autoplay='';
    const label=entry.group==='film'?'三镜完整成片 · 12s':videoLabel;
    if(entry.group==='film')video.controls=true;
    video.setAttribute('aria-label',entry.title+' · '+label);if(entry.poster)video.poster=entry.poster;
    const badge=document.createElement('span');badge.className='video-badge';badge.textContent=label;
    const play=document.createElement('button');play.type='button';play.className='video-play';play.textContent='播放 ▶';play.setAttribute('aria-label','播放 '+entry.title);
    play.addEventListener('click',e=>{e.stopPropagation();video.play().catch(()=>{});});
    frame.append(video,badge,play);return frame;
  }
  function renderIdentity(){
    const master=state.available.find(x=>x.id==='model-master');
    const portrait=state.available.find(x=>x.id==='model-closeup')||master;
    const video=state.available.find(x=>x.group==='video'&&x.shot==='S04');
    $('#model-motion').replaceChildren(...(video?[videoCard(video)]:[]));
    $('#model-face').replaceChildren(...(portrait?[media(portrait)]:[]));
    $('#identity-thumbs').replaceChildren(...state.available.filter(x=>['model-master','model-full'].includes(x.id)).map(x=>media(x)));
  }
  function render() {
    for(const [group,selector] of [['garment','#garment-gallery'],['model','#model-gallery'],['life','#life-gallery']]){
      const entries=state.available.filter(x=>x.group===group && (group!=='model'||x.id!=='model-master'));
      if(group==='model')entries.sort((a,b)=>Number(a.id==='model-outfit')-Number(b.id==='model-outfit'));
      $(selector).replaceChildren(...entries.map(card));
    }
    renderIdentity();
    const groups=[['garment','01 服装',4],['model','02 人物',6],['life','03 生活摄影',9],['shot','04 镜头',12]];
    const grid=$('#overview-grid');grid.replaceChildren();
    for(const [group,label,to] of groups){
      const entries=state.available.filter(x=>x.group===group&&(group!=='shot'||catalogue.productionSequence.includes(x.shot))),videos=state.available.filter(x=>x.group==='video');
      if(!entries.length && !(group==='shot'&&videos.length)) continue;
      const button=document.createElement('article');button.className='overview-block overview-'+group;button.dataset.group=group;button.dataset.reveal='';
      button.style.setProperty('--stagger',grid.children.length*75+'ms');
      const heading=document.createElement('button');heading.type='button';heading.dataset.go=to;heading.className='overview-label';
      heading.innerHTML=`<b>${label}</b><small>${entries.length} 张${group==='shot'?` / ${videos.length} 段视频`:''} ↗</small>`;
      const pictures=document.createElement('span');pictures.className='overview-pictures';
      const choices=entries.filter(x=>(group!=='shot'||x.frame==='first')&&x.id!=='model-master');
      if(group==='model')choices.sort((a,b)=>Number(a.id==='model-outfit')-Number(b.id==='model-outfit'));
      for(const entry of choices.slice(0,group==='garment'?2:group==='shot'?1:2)) pictures.append(media(entry,false));
      if(group==='shot'){
        const entry=state.available.find(x=>x.group==='film')||videos.find(x=>x.shot==='S04')||videos[0];
        if(entry){pictures.replaceChildren(videoCard(entry));}
      }
      const foot=document.createElement('span');foot.className='overview-caption';foot.textContent={garment:'THE PIECES / 造型的起点',model:'THE MUSE / 同一位人物',life:'IN REAL LIGHT / 生活里的光',shot:'THE FILM / 三个镜头，一段故事'}[group];
      button.append(heading,pictures,foot);grid.append(button);
      button.addEventListener('click',e=>{if(!e.target.closest('button'))heading.click();});
    }
    $('#video-count').textContent=`已生成 ${state.available.filter(x=>x.group==='video').length} 段（${state.available.filter(x=>x.group==='video').map(x=>x.shot).join('、')}） · 三镜成片 12 秒。生成提交 ${catalogue.apiCalls} 次（3 次成功，2 次余额不足拒绝）。`;
    observePage();syncPlayback();
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}
  },{threshold:.08});
  function observePage(){
    observer.disconnect();
    $$('.slide.active [data-reveal]').forEach(el=>{el.classList.remove('is-revealed');observer.observe(el);});
  }
  function syncPlayback(){
    $$('video').forEach(video=>{
      const active=video.closest('.slide.active') && !document.hidden && !video.hidden;
      if(!active)video.pause();
      else if(video.hasAttribute('data-autoplay')){
        if(reduced()){
          video.pause();
          // Reload once on entering reduced motion to restore the actual poster.
          if(!video.dataset.posterRestored){video.load();video.dataset.posterRestored='true';}
          // load() can cancel a queued pause event; keep the manual control visible.
          video.parentElement.classList.remove('is-playing');
        }else{delete video.dataset.posterRestored;video.play().catch(()=>{});}
      }
    });
  }
  document.addEventListener('play',e=>{if(e.target.matches('video'))e.target.parentElement.classList.add('is-playing');},true);
  document.addEventListener('pause',e=>{if(e.target.matches('video'))e.target.parentElement.classList.remove('is-playing');},true);
  document.addEventListener('fashion:media',syncPlayback);
  document.addEventListener('fashion:page',()=>{observePage();syncPlayback();});
  document.addEventListener('fashion:motion',()=>{
    if(reduced()){
      $$('.media-visual').forEach(el=>el.style.transform='');
      $$('.lightbox img').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    }
    syncPlayback();
  });
  document.addEventListener('visibilitychange',syncPlayback);
  let pointerFrame=0;
  document.addEventListener('pointermove',e=>{
    const frame=e.target.closest('.media-frame');
    if(!frame || reduced() || e.pointerType!=='mouse' || pointerFrame)return;
    pointerFrame=requestAnimationFrame(()=>{
      pointerFrame=0;const rect=frame.getBoundingClientRect();
      const visual=$('.media-visual',frame);if(visual)visual.style.transform=`translate(${((e.clientX-rect.x)/rect.width-.5)*5}px,${((e.clientY-rect.y)/rect.height-.5)*5}px) scale(1.025)`;
    });
  },{passive:true});
  document.addEventListener('pointerout',e=>{const frame=e.target.closest('.media-frame');if(frame&&!frame.contains(e.relatedTarget)){const visual=$('.media-visual',frame);if(visual)visual.style.transform='';}},{passive:true});
  const box=$('#gallery-lightbox'), image=$('#lightbox-image');
  let selection=[],at=0,opener=null,source=null,transition=null,closing=false,version=0;
  function animateImage(from,to,reverse=false){
    if(reduced()||!from||!to)return null;
    const start={transform:`translate(${from.x-to.x}px,${from.y-to.y}px) scale(${from.width/to.width},${from.height/to.height})`,opacity:1};
    const end={transform:'none',opacity:1};
    return image.animate(reverse?[end,start]:[start,end],{duration:reverse?500:700,easing:ease});
  }
  async function showEntry(entry,origin=null){
    const token=++version;transition?.cancel();
    image.src=entry.path;image.alt=entry.title;
    $('#lightbox-title').textContent=entry.title;$('#lightbox-description').textContent=entry.description;
    $('#lightbox-position').textContent=`${at+1} / ${selection.length}`;
    references(entry.refs,$('#lightbox-refs'));
    $('#lightbox-prev').disabled=selection.length<2;$('#lightbox-next').disabled=selection.length<2;
    try{await image.decode();}catch{return;}
    if(token!==version||!box.open)return;
    transition=origin ? animateImage(origin.getBoundingClientRect(),image.getBoundingClientRect()) : reduced()?null:image.animate([{opacity:0},{opacity:1}],{duration:500,easing:ease});
  }
  function open(entry,button){
    opener=button;source=$('img',button);at=selection.findIndex(x=>x.id===entry.id);
    box.showModal();closing=false;showEntry(entry,source);$('#lightbox-close').focus({preventScroll:true});
  }
  async function close(){
    if(closing||!box.open)return;closing=true;++version;transition?.cancel();
    // A reversed shared-image transition returns to the currently selected card.
    const target=selection[at]&&$(`.slide.active [data-gallery-id="${selection[at].id}"] img`);
    const rect=target?.getBoundingClientRect();
    const animation=rect&&rect.y>=0&&rect.bottom<=innerHeight?animateImage(rect,image.getBoundingClientRect(),true):null;
    if(animation)try{await animation.finished;}catch{}
    if(box.open)box.close();closing=false;opener?.focus({preventScroll:true});
  }
  function step(delta){if(closing)return;at=(at+delta+selection.length)%selection.length;showEntry(selection[at]);}
  $('#lightbox-close').addEventListener('click',close);
  $('#lightbox-prev').addEventListener('click',()=>step(-1));$('#lightbox-next').addEventListener('click',()=>step(1));
  box.addEventListener('cancel',e=>{e.preventDefault();close();});
  box.addEventListener('click',e=>{if(e.target===box)close();});
  box.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();step(e.key==='ArrowRight'?1:-1);}});
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-gallery-id]');
    if(button){const entry=state.available.find(x=>x.id===button.dataset.galleryId);if(!entry)return;
      selection=state.available.filter(x=>x.group===entry.group);
      open(entry,button);
    }
    const ref=e.target.closest('[data-ref-path]');
    if(ref){const entry={id:'reference',path:ref.dataset.refPath,title:'参考输入',description:'同名素材元数据记录的站内参考图。',refs:[]};
      if(box.open){selection=[...selection,entry];at=selection.length-1;showEntry(entry);}else{selection=[entry];open(entry,ref);}
    }
  });
  document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-gallery-id][role=button]')){e.preventDefault();e.target.click();}});
})();
