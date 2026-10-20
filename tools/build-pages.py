from pathlib import Path
from zipfile import ZipFile
import shutil,urllib.request

root=Path(__file__).resolve().parents[1]
output=root/'_site'
output.mkdir(exist_ok=True)
for name in ['index.html','assets','css','js','data','.nojekyll']:
    source=root/name
    if source.is_dir():shutil.copytree(source,output/name,dirs_exist_ok=True)
    elif source.is_file():shutil.copy2(source,output/name)
url='https://github.com/opc8838-hub/clothes/releases/download/humen-ai-talk-2026-10-20/humen-fashion-talk-site.zip'
archive=root/'humen-site-download.zip'
urllib.request.urlretrieve(url,archive)
dest=output/'humen-ai-talk'
with ZipFile(archive) as z:
    assert z.testzip() is None
    for item in z.infolist():
        if item.is_dir():continue
        parts=Path(item.filename).parts
        assert parts[0]=='humen-fashion-talk'
        relative=Path(*parts[1:])
        if relative.as_posix()=='docs/HANDOFF_CODEX_2026-10-20.md':continue
        target=(dest/relative).resolve()
        assert target.is_relative_to(dest.resolve())
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(z.read(item))
index=dest/'index.html'
text=index.read_text(encoding='utf-8')
assert 'href="deliverables/humen-fashion-talk-site.zip"' in text
index.write_text(text.replace('href="deliverables/humen-fashion-talk-site.zip"',f'href="{url}"'),encoding='utf-8')
finish=dest/'js/finish.js'
text=finish.read_text(encoding='utf-8')
before="  fetch(fullDownload.getAttribute('href'),{method:'HEAD'}).then(response=>{"
after="  if(new URL(fullDownload.href).origin===location.origin)fetch(fullDownload.getAttribute('href'),{method:'HEAD'}).then(response=>{"
assert before in text
finish.write_text(text.replace(before,after),encoding='utf-8')
assert (dest/'assets/fashion/female/video/S04.mp4').stat().st_size==10053880
print('Published site files:',sum(p.is_file() for p in output.rglob('*')))
