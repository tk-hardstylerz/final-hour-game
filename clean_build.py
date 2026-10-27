import subprocess, os, shutil, sys

os.chdir('C:/Users/HP/Desktop/final-hour/client')

# Step 1: Build with Nuitka
print('=== Step 1: Nuitka build ===')
env = os.environ.copy()
env['VSLANG'] = '1033'
result = subprocess.run(
    [sys.executable, '-m', 'nuitka',
     '--standalone', '--python-flag=no_site',
     '--user-plugin=CyalPlugin.py',
     '--windows-console-mode=disable',
     'final_hour.py'],
    capture_output=True, text=True, timeout=600, env=env
)
print('Build RC:', result.returncode)
if result.returncode != 0:
    print('STDERR:', result.stderr[-500:])
    print('STDOUT:', result.stdout[-500:])
    sys.exit(1)
if 'Successfully created' in result.stderr:
    print('BUILD OK')
else:
    print('WARNING: unexpected build output')
    print(result.stderr[-300:])

# Step 2: Test the exe from dist
print()
print('=== Step 2: Test dist exe ===')
r = subprocess.run(['final_hour.dist/final_hour.exe'], capture_output=True, text=True, timeout=15)
print('EXE RC:', r.returncode)
print('stdout:', repr(r.stdout[:200]))
if r.returncode == 3221225477:
    print('ACCESS VIOLATION!')
    sys.exit(1)

# Step 3: Create final_hour directory and copy everything
print()
print('=== Step 3: Copy resources ===')
os.makedirs('final_hour', exist_ok=True)
os.makedirs('final_hour/data', exist_ok=True)

import shutil

# Copy DLLs
for f in os.listdir('dlls_windows'):
    src = os.path.join('dlls_windows', f)
    dst = os.path.join('final_hour', f)
    if os.path.isdir(src):
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dst)
# Copy .mhr files
for f in os.listdir('.'):
    if f.endswith('.mhr'):
        shutil.copy2(f, 'final_hour')
# Copy keyconfig
shutil.copy2('default_keyconfig.json', 'final_hour')
# Copy Nuitka dist output
shutil.copytree('final_hour.dist', 'final_hour', dirs_exist_ok=True)
# Copy data directory
shutil.copytree('data', 'final_hour/data', dirs_exist_ok=True)
# Copy urlextract directory
shutil.copytree('urlextract', 'final_hour/urlextract', dirs_exist_ok=True)
print('Copy complete')

# Step 4: Test the final exe
print()
print('=== Step 4: Test final exe ===')
try:
    r = subprocess.run(['final_hour/final_hour.exe'], capture_output=True, text=True, timeout=15)
    rc = r.returncode
    print('FINAL EXE RC:', rc)
    print('stdout:', repr(r.stdout[:200]))
except subprocess.TimeoutExpired:
    print('FINAL EXE: timed out (game running = success, no crash)')
    rc = 0
if rc == 3221225477:
    print('ACCESS VIOLATION!')
    sys.exit(1)

# Step 5: Clean up
print()
print('=== Step 5: Clean up ===')
shutil.rmtree('final_hour.dist', ignore_errors=True)
shutil.rmtree('final_hour.build', ignore_errors=True)
print('done')
