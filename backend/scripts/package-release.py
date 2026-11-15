"""Build a reproducible team source/data archive without credentials or live records."""
import hashlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZIP_STORED

root = Path(__file__).resolve().parents[2]
destination = root.parent / 'releases'
destination.mkdir(exist_ok=True)
archive = destination / 'The-Explorers-1.0.0.zip'
excluded = {'.secrets', 'node_modules', '.wrangler', '.sites-runtime', '.git', 'tools', '__pycache__'}
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=3, strict_timestamps=False) as output:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if not file.is_file() or any(part in excluded for part in relative.parts):
            continue
        if file.suffix in {'.log', '.pyc'} or file.name.startswith('.env') or file.name in {'.audit-release.json', 'explorers-local-ca.crt'}:
            continue
        output.write(file, Path('The-Explorers-1.0.0') / relative,
                     compress_type=ZIP_STORED if file.suffix.lower() in {'.jp2', '.png', '.webp', '.zip'} else ZIP_DEFLATED)
with ZipFile(archive) as check:
    assert not any(set(Path(name).parts) & excluded for name in check.namelist())
    assert any('/data/ar/raw/' in name for name in check.namelist())
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
archive.with_suffix('.zip.sha256').write_text(digest + '  ' + archive.name + '\n')
print(f'Packaged {archive} ({archive.stat().st_size:,} bytes), including original AR source data; no private keys or live database.')
