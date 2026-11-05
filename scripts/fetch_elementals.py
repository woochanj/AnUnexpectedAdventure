# chierit "Elementals" 무료판 (CC-BY 4.0) 프레임을 공개 GitHub 저장소 사본에서 받아 동작별 가로 띠로 합친다.
# 폴더 이름이 캐릭터마다 달라서 (01_idle / idle / 07_1_atk ...) 번호 접두사를 바꿔 가며 찾는다.
import io
import os
import sys
import urllib.error
import urllib.request
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets-in', 'elementals')
REPO = 'https://raw.githubusercontent.com/Mohammed2372/Elemental-Showdown/{br}/elemental-showdown/Assets/Players/'
CHARS = {
    'water-priestess': 'Elementals_water_priestess/png',
    'wind-hashashin': 'elementals_wind_hashashin/PNG',
    'metal-bladekeeper': 'Elementals_metal_bladekeeper/PNG animations',
    'ground-monk': 'Elementals_ground_monk/png',
}
ANIMS = ['idle', 'run', '1_atk', '2_atk', '3_atk', 'sp_atk', 'air_atk', 'defend', 'take_hit', 'death', 'roll']

cache = {}


def get(url):
    if url in cache:
        return cache[url]
    try:
        with urllib.request.urlopen(url.replace(' ', '%20'), timeout=30) as r:
            data = r.read()
    except urllib.error.HTTPError:
        data = None
    cache[url] = data
    return data


branch = next(b for b in ('main', 'master') if get(REPO.format(br=b) + 'elementals_wind_hashashin/PNG/idle/idle_1.png'))
base = REPO.format(br=branch)
os.makedirs(OUT, exist_ok=True)
only = set(sys.argv[1:])
for name, folder in CHARS.items():
    if only and name not in only:
        continue
    for anim in ANIMS:
        cands = [anim] + [f'{i:02d}_{anim}' for i in range(1, 16)]
        found = None
        for c in cands:
            if get(f'{base}{folder}/{c}/{anim}_1.png'):
                found = c
                break
        if not found:
            print(f'{name:18} {anim:9} -- missing')
            continue
        frames = []
        for n in range(1, 80):
            d = get(f'{base}{folder}/{found}/{anim}_{n}.png')
            if not d:
                break
            frames.append(Image.open(io.BytesIO(d)).convert('RGBA'))
        w, h = frames[0].size
        strip = Image.new('RGBA', (w * len(frames), h))
        for i, f in enumerate(frames):
            strip.paste(f, (i * w, 0))
        os.makedirs(os.path.join(OUT, name), exist_ok=True)
        strip.save(os.path.join(OUT, name, f'{anim}.png'))
        print(f'{name:18} {anim:9} {len(frames):2} frames {w}x{h}  ({found})')
