/* Public asset catalogue. Presence and decodability are checked on every load.
   refs contains only project assets from the matching metadata's inputs array.
   Pending files are intentionally listed, so adding them requires no UI changes. */
window.FASHION_GALLERY = (() => {
  const root = 'assets/fashion/female/';
  const image = (id, group, file, title, description, refs = []) => ({
    id, group, path:root + file + '.png', title, description, refs,
    status:'unverified', metadata:root + file + '.json'
  });
  const items = [
    image('garment-halter','garment','garment-silver-halter-flatlay','银灰挂脖上衣','AI 概念样衣／非实体商品实拍'),
    image('garment-trousers','garment','garment-black-flare-trousers-flatlay','黑色微喇裤','独立单品，核对九分裤长与微喇轮廓。'),
    image('garment-hem','garment','garment-trousers-hem-detail','裤脚细节','近看裤脚开口、垂坠与鞋的关系。'),
    image('model-master','model','model-master','人物身份母图','用面部比例、发型和肤色固定同一位成年人物。'),
    image('model-full','identity','model-full','全身身份工作底图','用于锁定身份与比例的工作底图，并非穿搭成片。'),
    image('model-outfit','model','outfit-v3-longer-legs','全身穿搭写真','银灰挂脖、黑色九分裤与细带凉鞋，完整核对比例。'),
    image('model-closeup','model','model-portrait-closeup','近距离肖像','近看面部、发际线与自然皮肤纹理。'),
    image('model-profile','model','model-profile','侧脸写真','从侧面继续核对人物身份与发型。'),
    image('model-back','model','model-back-halter','背后挂脖系带','观察背部轮廓与挂脖系带的关系。'),
    image('model-seated','model','model-seated-editorial','坐姿写真','放松坐姿，保持人物与穿搭一致。'),
    image('life-natural','life','outfit-v4-natural-light','石墙边的自然光','延续已确认的人物与穿搭，用自然侧光建立生活感。',[root+'outfit-v3-longer-legs.png']),
    image('life-cafe','life','life-cafe','街角咖啡馆','把同一套穿搭带入咖啡馆的日常片刻。'),
    image('life-stairs','life','life-stairs','石阶上的停留','用建筑层次、站姿与光影延展画面。'),
    image('life-flowershop','life','life-flowershop','花店门前','花材与街景作为环境，保留人物和服装的辨识度。'),
    image('life-bridge','life','life-bridge','桥上的风','让开阔街景与自然光承接同一组生活摄影。')
  ];
  const shots = [
    ['S01','building','城市开场'],['S02','car','车内人物'],['S03','exit','下车出场'],
    ['S04','walk','街头行走'],['S05','detail','服装细节'],['S06','sunglasses','墨镜特写'],
    ['S07','turn','侧身回望'],['S08','overhead','俯拍造型'],['S09','cover','封面定格']
  ];
  for (const [id,slug,title] of shots) {
    if(!['S04','S07','S09'].includes(id))continue;
    for (const [frame,label] of [['first','首帧'],['last','尾帧']]) {
      if(frame==='last')continue;
      const file = `shot-${id}-${slug}-${frame}-frame`;
      const entry = image(`${id}-${frame}`,'shot',file,`${id} ${title} · ${label}`,'静态镜头输入；视频状态单独核对。');
      entry.shot=id; entry.frame=frame;
      const aliases={S03:['exit-car','car-exit'],S05:['garment-detail','fabric-detail'],S07:['lookback','turnback'],S08:['top','high-angle'],S09:['final','freeze']};
      entry.candidates = [...(['S05','S06','S08'].includes(id) ? [root+file+'-v2.png',root+`shot-${id}-${slug}-v2-${frame}-frame.png`] : []),entry.path,...(aliases[id]||[]).map(alias=>root+`shot-${id}-${alias}-${frame}-frame.png`),root+`shot-${id}-${frame}-frame.png`];
      items.push(entry);
    }
    items.push({id:`${id}-video`, group:'video', shot:id, path:root+`video/${id}.mp4`,
      poster:root+`video/${id}-poster.jpg`, metadata:root+`video/${id}.json`,
      title:`${id} ${title}`, description:'MiniMax-H3-Max 实际生成 · 768P · 5s',
      refs:[], status:'unverified', ...(id==='S04' ? {task_id:'453995391877565',apiCalls:1} : {})});
  }
  items.push({id:'three-shot-film',group:'film',path:root+'video/film-three-shots.mp4',poster:root+'video/film-three-shots-poster.jpg',title:'三镜完整短片',description:'3 个真实镜头 · 12 秒连贯成片',refs:[],status:'unverified',duration:12});
  return {items, apiCalls:5, successfulTasks:3, productionSequence:['S04','S07','S09']};
})();
