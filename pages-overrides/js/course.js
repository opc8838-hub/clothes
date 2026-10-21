/* Teaching chapter is assembled before the existing presentation binds events. */
(() => {
  'use strict';
  const course=window.FASHION_COURSE,data=window.FASHION_TALK;
  if(!course||!data)return;
  const oldSlides=[...document.querySelectorAll('.slide')],legacy=oldSlides[1],offset=course.lessons.length-1;
  const resolve=n=>Number(n)>=2?Number(n)+offset:Number(n);
  window.fashionResolveLegacyIndex=resolve;
  window.FASHION_COURSE_ROUTES={start:0,basics:1,overview:resolve(2),references:resolve(3),garment:resolve(4),person:resolve(6),scene:resolve(9),video:resolve(12),showroom:resolve(13),closing:resolve(14)};
  course.lessons.forEach((l,i)=>{window.FASHION_COURSE_ROUTES[l.id]=i+1;});
  document.querySelectorAll('[data-go]').forEach(b=>{b.dataset.go=resolve(b.dataset.go);});
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ribbon=current=>`<nav class="course-ribbon" aria-label="基础课模块">${course.modules.map((name,i)=>`<button type="button" data-go="${i*3+1}" aria-current="${i+1===current}" title="${e(name)}"><span>${String(i+1).padStart(2,'0')}</span><b>${e(name)}</b></button>`).join('')}</nav>`;
  const notes=l=>`模块${l.module}：${l.module_title}\n建议${l.minutes}分钟，可按课堂情况展开。\n\n${l.notes}\n\n课堂提问：${l.question}\n参考答案：${l.answer}${l.activity?'\n\n练习：'+l.activity:''}`;
  function interactive(l){
    if(l.interactive==='prompt')return `<section class="course-lab" aria-labelledby="prompt-lab-title"><h2 id="prompt-lab-title">把你的任务，写成制作说明。</h2><p>本工作台只整理文字；参考图需要在实际生成工具中附上。</p><div class="course-prompt-grid">${[['task','任务','为这件上衣制作一张生活场景图'],['refs','参考分工','图1控制服装款式，图2控制原创成年人物身份，图3只控制光线与场景'],['keep','必须保留','人物身份、上衣领口、几何拼接和裤长'],['change','本轮允许修改','只改变背景和自然站姿'],['output','输出要求','单张竖图，头脚完整，衣服关键结构清楚'],['accept','验收标准','手不挡领口或腰线；不新增配饰；脸、手、比例与阴影自然']].map(([id,label,value])=>`<label for="course-prompt-${id}">${label}<textarea id="course-prompt-${id}" data-course-prompt="${id}" rows="2">${e(value)}</textarea></label>`).join('')}</div><label class="course-output-label" for="course-prompt-output">本次提示词</label><textarea id="course-prompt-output" rows="8" readonly></textarea><button type="button" class="button dark" id="course-copy-prompt">复制制作说明</button><p id="course-copy-status" role="status"></p></section>`;
    if(l.interactive==='calculator')return `<section class="course-lab" aria-labelledby="course-cost-title"><h2 id="course-cost-title">先做一次小样预算。</h2><p>以下单价为教学示例，采用按秒计费假设；不是平台实时报价。</p><form id="course-cost-form" class="course-cost-form">${[['shots','最终镜头总数',3,1,30,1],['reuse','可复用镜头数',1,0,30,1],['seconds','每镜生成秒数',5,1,60,0.1],['price','示例单价（元/秒）',0.5,0,10000,0.01],['retries','预留额外重试次数',1,0,30,1]].map(([id,label,value,min,max,step])=>`<label for="course-cost-${id}">${label}<input id="course-cost-${id}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" required></label>`).join('')}</form><output id="course-cost-result" for="course-cost-shots course-cost-reuse course-cost-seconds course-cost-price course-cost-retries" aria-live="polite"></output><p class="course-caveat">预留重试是预算，不表示已创建任务。失败是否收费、最低时长和实际单价请查当前工具规则。人工与后期成本需另外计入。</p></section>`;
    if(l.interactive==='checklist')return `<section class="course-lab"><h2>人工检查，逐项留痕。</h2><div id="course-checks" class="course-checks">${['商品领口、拼接、图案、裤长与参考一致','人物身份、发型和身体比例一致','脸、手、脚步与遮挡关系合理','光线、材质、阴影和接地关系成立','视频已完整查看，复杂动作中间帧已复核','尺寸、比例、格式、来源与版本已记录'].map(t=>`<label><input type="checkbox">${e(t)}</label>`).join('')}</div><p id="course-check-count" role="status">已人工核对 0 / 6 项</p><p class="course-caveat">这只是你的检查记录，不是自动质量认证。尚未解决的偏差需要另外记录。</p></section>`;
    return '';
  }
  const fragment=document.createDocumentFragment();
  course.lessons.forEach((l,i)=>{
    const section=l.kind==='legacy'?legacy.cloneNode(true):document.createElement('section');
    section.classList.add('slide','course-slide');section.dataset.lesson=l.id;section.dataset.courseModule=l.module;section.hidden=true;
    const title=`course-title-${i+1}`;section.setAttribute('aria-labelledby',title);
    section.dataset.layout=l.layout||'steps';
    const heading=`${ribbon(l.module)}<div class="heading course-heading"><p class="kicker">第 ${String(i+1).padStart(2,'0')} 课 / 共 ${String(course.lessons.length).padStart(2,'0')} 课 <span>${e(l.module_title)}</span></p><h1 id="${title}">${e(l.title)}<em>${e(l.em)}</em></h1></div><p class="course-takeaway"><span>记住这句</span><strong>${e(l.takeaway)}</strong></p>`;
    const concepts=`<section class="course-method" aria-label="${e(l.method_title)}"><h2 class="course-section-label">${e(l.method_title||'照着这三步做')}</h2><div class="course-concepts">${l.points.map((p,n)=>`<article><span class="course-point-number">${String(n+1).padStart(2,'0')}</span><h2>${e(p.term)}</h2><p>${e(p.text)}</p></article>`).join('')}</div></section>`;
    let legacyMarkup='';
    if(l.kind==='legacy'){
      legacyMarkup=`<details class="course-tool-demo"><summary>点选工具例子：同样是整理照片，谁能帮到哪一步？</summary><div class="course-tool-tabs"><button type="button" data-basic="chat" aria-pressed="true">给我建议</button><button type="button" data-basic="agent" aria-pressed="false">帮我执行</button><button type="button" data-basic="harness" aria-pressed="false">查看记录</button></div><p id="basic-answer"></p><strong id="basic-result"></strong></details>`;
    }
    const question=l.quiz?`<div class="course-quiz" data-course-quiz="${l.id}"><p>${e(l.question)}</p><div>${l.quiz.options.map((option,n)=>`<button type="button" data-course-answer="${n}" aria-pressed="false">${e(option)}</button>`).join('')}</div><p class="course-quiz-feedback" role="status" hidden></p></div>`:`<details class="course-discuss"><summary>课堂提问：${e(l.question)}</summary><p>${e(l.answer)}</p></details>`;
    section.innerHTML=heading+concepts+`<div class="course-practice-pair"><div class="course-example"><span>可以这样做</span><p>${e(l.example)}</p></div><div class="course-mistake"><b>容易踩的坑</b><p>${e(l.mistake)}</p></div></div>`+legacyMarkup+interactive(l).replace('id="course-prompt-output" data-course-prompt="output"','id="course-prompt-delivery" data-course-prompt="output"').replace('for="course-prompt-output">输出要求','for="course-prompt-delivery">输出要求')+`<div class="course-teach-more">`+question+(l.activity?`<p class="course-activity"><b>动手练习</b>${e(l.activity)}</p>`:'')+`<details class="course-explain"><summary>讲师展开：详细讲法、案例和参考答案</summary><p>${e(l.notes)}</p><p><b>参考答案：</b>${e(l.answer)}</p></details></div><footer class="course-footer"><span>第 ${i+1} / ${course.lessons.length} 课 · 建议 ${l.minutes} 分钟</span><a href="handbook.html#${l.id}" target="_blank" rel="noopener">本课完整讲义 ↗</a><a href="docs/AI基础课-学员练习单.md" download>练习单 ↓</a><button type="button" data-go="${resolve(2)}">进入服装实操 →</button></footer>`;
    fragment.append(section);
  });
  legacy.replaceWith(fragment);
  const oldPages=data.pages;
  data.pages=[oldPages[0],...course.lessons.map(l=>[l.title+l.em,'基础 / '+l.module_title,notes(l)]),...oldPages.slice(2)];
  data.basics={chat:['你把照片发给助手，它先给分类建议，例如按商品、人物、场景分组。部分应用也能操作文件，具体看它连了哪些工具。','先得到一份整理办法'],agent:['连上文件工具并获得权限后，帮手才可能真的创建文件夹、整理照片。执行后仍要检查文件有没有放错。','先计划 → 实际操作 → 检查结果'],harness:['像工作记录本：记下哪些文件移动了、哪一步失败了，方便你回头检查。它也会限制能操作哪些地方。','看得见做了什么，出错能回查']};
  document.querySelector('#basic-answer').textContent=data.basics.chat[0];
  document.querySelector('#basic-result').textContent=data.basics.chat[1];
  document.querySelectorAll('.slide').forEach((slide,i)=>{
    slide.dataset.index=i;
    if(!slide.classList.contains('course-slide')){
      const kicker=slide.querySelector('.kicker');
      if(kicker)kicker.textContent=kicker.textContent.replace(/^\d+\s*\//,String(i+1).padStart(2,'0')+' /');
    }
  });
  document.querySelector('.chapters button')?.replaceChildren(document.createTextNode('AI基础课'));
  const moduleButtons=[...document.querySelectorAll('.chapters button')];
  moduleButtons.find(b=>b.textContent.includes('九镜'))?.replaceChildren(document.createTextNode('三镜短片'));
  const topLink=document.querySelector('.top-actions a');
  if(topLink){topLink.href='handbook.html';topLink.textContent='讲师讲义 ↗';topLink.target='_blank';topLink.rel='noopener';}
  const cover=document.querySelector('.cover-copy');
  if(cover){const extra=document.createElement('p');extra.className='course-cover-note';extra.textContent='授课版 · 8个基础模块 / 24页基础课 / 服装与视频实操';cover.append(extra);}
  document.addEventListener('click',event=>{
    const answer=event.target.closest('[data-course-answer]');
    if(answer){
      const box=answer.closest('[data-course-quiz]'),lesson=course.lessons.find(l=>l.id===box.dataset.courseQuiz),choice=Number(answer.dataset.courseAnswer);
      box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===answer)));
      const feedback=box.querySelector('.course-quiz-feedback');feedback.hidden=false;feedback.textContent=lesson.quiz.explanations[choice];feedback.dataset.correct=String(choice===lesson.quiz.correct);
    }
  });
  const promptOutput=document.querySelector('#course-prompt-output');
  function updatePrompt(){
    if(promptOutput)promptOutput.value=[...document.querySelectorAll('[data-course-prompt]')].map(input=>`${input.previousSibling?.textContent?.trim()||input.parentElement.firstChild.textContent.trim()}：${input.value.trim()}`).join('\n\n')+'\n\n请使用实际附上的参考图；缺失的信息先列为待确认，不自行补充商品事实。';
  }
  document.querySelectorAll('[data-course-prompt]').forEach(input=>input.addEventListener('input',updatePrompt));updatePrompt();
  document.querySelector('#course-copy-prompt')?.addEventListener('click',async()=>{
    const status=document.querySelector('#course-copy-status');
    try{await navigator.clipboard.writeText(promptOutput.value);status.textContent='已复制制作说明。请在实际工具中附上对应参考图。';}
    catch{promptOutput.focus();promptOutput.select();status.textContent='已选中文本，请使用系统复制操作。';}
  });
  const cost=document.querySelector('#course-cost-form');
  function calculate(){
    const result=document.querySelector('#course-cost-result');if(!cost)return;
    const values=Object.fromEntries(['shots','reuse','seconds','price','retries'].map(k=>[k,Number(document.querySelector('#course-cost-'+k).value)]));
    const {shots,reuse,seconds,price,retries}=values;
    if(!cost.checkValidity()||reuse>shots||![shots,reuse,retries].every(Number.isInteger)){
      result.textContent='请输入有效数值；镜头数与重试次数须为整数，可复用镜头数不能超过总镜头数。';result.dataset.invalid='true';return;
    }
    delete result.dataset.invalid;
    const base=(shots-reuse)*seconds*price,retry=retries*seconds*price,money=n=>'¥'+n.toFixed(2);
    result.innerHTML=`<b>${money(base+retry)}</b><span>新增 ${shots-reuse} 镜 × ${seconds} 秒 × ${money(price)}/秒 = ${money(base)}<br>额外预留 ${retries} 次同长度重试 = ${money(retry)}</span>`;
  }
  cost?.addEventListener('input',calculate);cost?.addEventListener('submit',e=>e.preventDefault());calculate();
  document.querySelector('#course-checks')?.addEventListener('change',()=>{document.querySelector('#course-check-count').textContent=`已人工核对 ${document.querySelectorAll('#course-checks input:checked').length} / 6 项`;} );
  document.documentElement.dataset.courseVersion=course.version;
})();
