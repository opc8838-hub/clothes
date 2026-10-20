(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const stage=$('#stage'),scrollButton=$('#scroll-page');
  if(!stage)return;
  $('.skip-link').addEventListener('click',event=>{event.preventDefault();stage.focus({preventScroll:true});});
  let queued=false;
  function updateScroll(){
    queued=false;const slide=$('.slide.active');if(!slide)return;
    scrollButton.hidden=slide.scrollHeight-slide.clientHeight<30||slide.scrollTop+slide.clientHeight>=slide.scrollHeight-20;
  }
  function queueScroll(){if(!queued){queued=true;requestAnimationFrame(updateScroll);}}
  stage.addEventListener('scroll',queueScroll,true);
  window.addEventListener('resize',queueScroll,{passive:true});
  document.addEventListener('fashion:page',queueScroll);
  scrollButton.addEventListener('click',()=>$('.slide.active')?.scrollBy({top:$('.slide.active').clientHeight*.78,behavior:document.documentElement.dataset.motion==='off'?'auto':'smooth'}));
  const status=$('#gallery-status');
  window.fashionGallery.ready.then(items=>{
    if(items.length){status.hidden=true;}else{
      status.textContent='素材未能载入。请确认已启动本地预览服务。';
      const retry=document.createElement('button');retry.className='text-link';retry.textContent='重新载入';retry.addEventListener('click',()=>location.reload());status.append(retry);
    }
    queueScroll();
  }).catch(()=>{status.textContent='影像素材暂时无法载入，请刷新页面重试。';queueScroll();});
  document.addEventListener('load',queueScroll,true);
  const fullDownload=$('#download-site');
  fetch(fullDownload.getAttribute('href'),{method:'HEAD'}).then(response=>{
    if(!response.ok){fullDownload.removeAttribute('href');fullDownload.removeAttribute('download');fullDownload.setAttribute('aria-disabled','true');fullDownload.tabIndex=-1;fullDownload.textContent='当前为离线站点副本';}
  }).catch(()=>{fullDownload.setAttribute('title','请先启动本地预览服务，再下载站点包。');});
  const promptDownload=$('#download-prompts');promptDownload.disabled=window.fashionExport().shots.length!==3;
  document.addEventListener('fashion:shots-ready',()=>{promptDownload.disabled=false;});
  promptDownload.addEventListener('click',()=>{
    const content=window.fashionExport();
    const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='虎门服装AI-提示词与素材清单.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  for(const [container,ids] of [['.face-copy',['face-target','face-identity']],['.tryon-copy',['tryon-garment-file','tryon-model-file']]]){
    const selectors=ids[0].startsWith('face')?['.face-images figure:nth-child(1)','.face-images figure:nth-child(2)']:['.tryon-inputs figure:nth-child(1)','.tryon-inputs figure:nth-child(2)'];
    const defaults=ids.map((id,index)=>{const figure=$(selectors[index]);return {id,figure,src:figure.querySelector('img').getAttribute('src'),alt:figure.querySelector('img').alt,caption:figure.querySelector('figcaption').textContent,label:$('#'+id+'-name')};});
    const labels=ids[0].startsWith('face')?['face-target-name','face-identity-name']:['tryon-garment-name','tryon-model-name'];
    defaults.forEach((entry,index)=>{entry.label=$('#'+labels[index]);entry.labelText=entry.label.textContent;});
    const button=document.createElement('button');button.type='button';button.className='text-link reset-inputs';button.textContent='恢复示例输入';
    button.addEventListener('click',()=>{
      for(const entry of defaults){const image=entry.figure.querySelector('img');if(image.src.startsWith('blob:'))URL.revokeObjectURL(image.src);image.src=entry.src;image.alt=entry.alt;entry.figure.querySelector('figcaption').textContent=entry.caption;$('#'+entry.id).value='';entry.label.textContent=entry.labelText;}
      if(container==='.tryon-copy'){$('.tryon-result').classList.remove('stale');$('.tryon-result figcaption').textContent='实际生成 / 已认可的整套穿搭母图';$('#tryon-upload-status').textContent='替换参考后需重新生成，本页不会把旧图标成新结果。';}
    });
    $(container).append(button);
  }
  updateScroll();
})();
