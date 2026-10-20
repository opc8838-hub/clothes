from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil,urllib.request,hashlib

root=Path(__file__).resolve().parents[1]
output=root/'_site';output.mkdir(exist_ok=True)
for name in ['index.html','assets','css','js','data','.nojekyll']:
    source=root/name
    if source.is_dir():shutil.copytree(source,output/name,dirs_exist_ok=True)
    elif source.is_file():shutil.copy2(source,output/name)
base_url='https://github.com/opc8838-hub/clothes/releases/download/humen-ai-talk-2026-10-20/humen-fashion-talk-site.zip'
base=root/'base-site.zip';urllib.request.urlretrieve(base_url,base)
assert hashlib.sha256(base.read_bytes()).hexdigest()=='e2d611fb7d0ae23bda884508e63710434612d0031129e9b02cc3fe4c7352b81d'
dest=output/'humen-ai-talk'
with ZipFile(base) as z:
    assert z.testzip() is None
    for item in z.infolist():
        if item.is_dir():continue
        parts=Path(item.filename).parts;assert parts[0]=='humen-fashion-talk'
        relative=Path(*parts[1:])
        if relative.as_posix()=='docs/HANDOFF_CODEX_2026-10-20.md':continue
        target=(dest/relative).resolve();assert target.is_relative_to(dest.resolve())
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(item))
update=root/'three-shot-update.zip'
urllib.request.urlretrieve('https://github.com/opc8838-hub/clothes/releases/download/humen-three-shot-2026-10-21/humen-three-shot-update.zip',update)
assert hashlib.sha256(update.read_bytes()).hexdigest()=='a7a67d1c68227715ee1d7e9cf3cf56a9824faa0ae61390b8b5f0faf1f10b4c7e'
with ZipFile(update) as z:
    assert z.testzip() is None
    for item in z.infolist():
        if item.is_dir():continue
        target=(dest/item.filename).resolve();assert target.is_relative_to(dest.resolve())
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(item))
assert (dest/'assets/fashion/female/video/film-three-shots.mp4').stat().st_size==5395845
# Versioned text source overrides stay reviewable in Git.
overrides=root/'pages-overrides'
if overrides.exists():
    for source in overrides.rglob('*'):
        if source.is_file():
            target=(dest/source.relative_to(overrides)).resolve()
            assert target.is_relative_to(dest.resolve())
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(source,target)
# Build the full downloadable website on GitHub, avoiding a second large local upload.
full=dest/'deliverables/humen-fashion-talk-site.zip'
entries=[p for p in dest.rglob('*') if p.is_file() and p!=full]
with ZipFile(full,'w',ZIP_DEFLATED,compresslevel=6) as z:
    for p in entries:z.write(p,'humen-fashion-talk/'+p.relative_to(dest).as_posix())
print('Complete 3-shot website:',len(entries),'files; download ZIP:',full.stat().st_size)
