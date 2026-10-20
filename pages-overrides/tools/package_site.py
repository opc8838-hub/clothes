from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'deliverables' / 'humen-fashion-talk-site.zip'
ENTRIES = ['index.html','README.md','css/site.css','css/transitions.css','js/site.js','js/prompt-builders.js','data/talk.js','data/gallery.js','css/gallery.css','js/gallery.js','js/gallery-probe.js','assets/fashion','male-case','wardrobe','licenses','docs/female-editorial-workflow.md','docs/female-editorial-shot-plan.json','docs/female-outfit-v2-direction.md','docs/female-editorial-migration-plan.md','docs/完整网站设计说明.md','docs/动效来源.md','docs/网站验收.md','docs/风格统一验收.md','tools/serve-site.mjs','tools/package_site.py','deliverables/humen-fashion-ai-kit','deliverables/humen-fashion-ai-kit.zip','deliverables/humen-fashion-image.zip']
ENTRIES.extend(['film.html','docs/three-shot-film-plan.json','docs/三镜短片说明.md'])
ENTRIES.extend(['guide.html','css/guide.css','css/finish.css','js/finish.js','assets/favicon.svg','打开网站.cmd','docs/网站完成说明.md'])
ENTRIES.extend(['data/course.js','js/course.js','css/course.css','handbook.html','docs/ai-course.json','docs/AI基础课-讲师讲义.md','docs/AI基础课-学员练习单.md'])
with ZipFile(DEST,'w',ZIP_DEFLATED,compresslevel=6) as z:
    for name in ENTRIES:
        entry=ROOT/name
        paths=entry.rglob('*') if entry.is_dir() else [entry]
        for p in paths:
            if p.is_file() and not any(x in p.parts for x in ['.git','node_modules','__pycache__']):
                z.write(p,'humen-fashion-talk/'+p.relative_to(ROOT).as_posix())
with ZipFile(DEST) as z:
    assert z.testzip() is None
    print(f'{DEST} | {len(z.namelist())} files | {DEST.stat().st_size} bytes | verified')
