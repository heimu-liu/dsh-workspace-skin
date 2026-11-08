"""Copy only the installed app's DSH runtime into an isolated test directory."""
import json, pathlib, plistlib, shutil, struct, sys
app=pathlib.Path('/Applications/DeepSeek Harness.app/Contents')
version=plistlib.loads((app/'Info.plist').read_bytes())['CFBundleShortVersionString']
if version!='0.2.2-rc.1':
    raise SystemExit(f'Recheck compatibility before testing DSH {version}; expected 0.2.2-rc.1')
root=pathlib.Path(sys.argv[1]).resolve()
if not str(root).startswith('/private/tmp/dsh-skin-'):
    raise SystemExit('Extraction requires an isolated /private/tmp/dsh-skin-* directory')
archive=app/'Resources/app.asar'
links=[]
with archive.open('rb') as handle:
    header=struct.unpack('<4I',handle.read(16))
    tree=json.loads(handle.read(header[3]))
    def walk(node,parent=''):
        for name,entry in node.get('files',{}).items():
            relative=f'{parent}/{name}'.lstrip('/')
            if 'files' in entry:
                walk(entry,relative)
            elif relative.startswith('dsh/'):
                target=root/relative
                target.parent.mkdir(parents=True,exist_ok=True)
                if 'link' in entry:
                    links.append((target,root/entry['link']))
                elif entry.get('unpacked'):
                    shutil.copy2(str(archive)+'.unpacked/'+relative,target)
                else:
                    handle.seek(8+header[1]+int(entry['offset']))
                    target.write_bytes(handle.read(entry['size']))
                if entry.get('executable'):target.chmod(0o755)
    walk(tree)
for target,source in links:
    if not target.exists():target.symlink_to(source)
print('Prepared DSH '+version+' isolated runtime')
