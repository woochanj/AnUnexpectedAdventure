# 받은 스프라이트를 게임용으로 정리한다.
# - 캐릭터마다 모든 동작의 모든 프레임을 겹쳐 본 테두리(union bbox)로 잘라 같은 크기로 맞춘다 (발이 아래 끝에 오도록)
# - 동작마다 가로 한 줄(strip) PNG로 다시 저장
# - 공격 동작은 무기가 가장 멀리 뻗는 프레임을 '타격 프레임'으로 기록
# usage: python3 -I pack_sprites.py <assets-in dir> <repo public/sprites dir> <manifest.ts out>
import json
import os
import sys
from PIL import Image

SRC, OUT, MANIFEST = sys.argv[1:4]


def frames_of(path, fw, fh):
    # 낱장 프레임 목록이면 그대로, 가로 띠 파일이면 잘라서
    if isinstance(path, list):
        return [Image.open(p).convert('RGBA') for p in path]
    im = Image.open(path).convert('RGBA')
    n = im.width // fw
    return [im.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(n)]


def seq(folder, prefix):
    """'adventurer-run-00.png', '-01' ... 처럼 번호 붙은 낱장 프레임을 순서대로"""
    if not os.path.isdir(folder):
        return []
    names = sorted(f for f in os.listdir(folder) if f.startswith(prefix + '-') and f[len(prefix) + 1:-4].isdigit())
    return [os.path.join(folder, f) for f in names]


LM = os.path.join(SRC, 'monsters-full')
LM13 = os.path.join(SRC, 'monsters', 'Monster_Creatures_Fantasy(Version 1.3)')
HK = os.path.join(SRC, 'heroknight', 'Hero Knight', 'Sprites')
FK = os.path.join(SRC, 'freeknight')
SP = os.path.join(SRC, 'creatures', 'spritepilot-creatures-pack', '32px')

# 캐릭터: { 이름: (프레임 폭, 프레임 높이, 오른쪽을 보는지, { 동작: 파일 }) }
CHARS = {
    'hero-knight': (180, 180, True, {
        'idle': f'{HK}/Idle.png', 'run': f'{HK}/Run.png', 'attack': f'{HK}/Attack1.png', 'attack2': f'{HK}/Attack2.png',
        'hurt': f'{HK}/Take Hit.png', 'death': f'{HK}/Death.png', 'jump': f'{HK}/Jump.png', 'fall': f'{HK}/Fall.png',
    }),
}
WZ = os.path.join(SRC, 'wizard')
MH = os.path.join(SRC, 'martial2')
CHARS['wizard'] = (231, 190, True, {
    'idle': f'{WZ}/Idle.png', 'run': f'{WZ}/Run.png', 'attack': f'{WZ}/Attack1.png', 'attack2': f'{WZ}/Attack2.png',
    'hurt': f'{WZ}/Hit.png', 'death': f'{WZ}/Death.png', 'jump': f'{WZ}/Jump.png', 'fall': f'{WZ}/Fall.png',
})
CHARS['martial-hero'] = (200, 200, True, {
    'idle': f'{MH}/Idle.png', 'run': f'{MH}/Run.png', 'attack': f'{MH}/Attack1.png', 'attack2': f'{MH}/Attack2.png',
    'hurt': f'{MH}/Take Hit.png', 'death': f'{MH}/Death.png', 'jump': f'{MH}/Jump.png', 'fall': f'{MH}/Fall.png',
})
# rvros Animated Pixel Adventurer (검 / 활 / 맨손)
RV = os.path.join(SRC, 'rvros')
A15 = os.path.join(RV, 'Adventurer-1.5', 'Individual Sprites')
ABOW = os.path.join(RV, 'Adventurer-Bow', 'Individual Sprites')
AHC = os.path.join(RV, 'Adventurer-Hand-Combat', 'Individual Sprites')
if os.path.isdir(A15):
    CHARS['adventurer'] = (50, 37, True, {
        'idle': seq(A15, 'adventurer-idle-2'), 'run': seq(A15, 'adventurer-run'),
        'attack': seq(A15, 'adventurer-attack1'), 'attack2': seq(A15, 'adventurer-attack2'), 'attack3': seq(A15, 'adventurer-attack3'),
        'combo': seq(A15, 'adventurer-attack1') + seq(A15, 'adventurer-attack2') + seq(A15, 'adventurer-attack3'),
        'cast': seq(A15, 'adventurer-cast') + seq(A15, 'adventurer-cast-loop'),
        'hurt': seq(A15, 'adventurer-hurt'), 'death': seq(A15, 'adventurer-die'), 'jump': seq(A15, 'adventurer-jump'), 'fall': seq(A15, 'adventurer-fall'),
    })
    CHARS['adventurer-bow'] = (50, 37, True, {
        'idle': seq(A15, 'adventurer-idle'), 'run': seq(A15, 'adventurer-run'),
        'attack': seq(ABOW, 'adventurer-bow'), 'attack2': seq(ABOW, 'adventurer-bow-jump'),
        'hurt': seq(A15, 'adventurer-hurt'), 'death': seq(A15, 'adventurer-die'), 'jump': seq(A15, 'adventurer-jump'), 'fall': seq(A15, 'adventurer-fall'),
    })
    CHARS['adventurer-fist'] = (50, 37, True, {
        'idle': seq(A15, 'adventurer-idle'), 'run': seq(AHC, 'adventurer-run2'),
        'attack': seq(AHC, 'adventurer-run-punch'), 'attack2': seq(AHC, 'adventurer-kick'), 'combo': seq(AHC, 'adventurer-punch'),
        'hurt': seq(A15, 'adventurer-hurt'), 'death': seq(AHC, 'adventurer-knock-dwn'), 'jump': seq(A15, 'adventurer-jump'), 'fall': seq(A15, 'adventurer-fall'),
    })

# chierit Elementals 무료판 (CC-BY 4.0) — fetch 스크립트가 동작별 띠로 미리 합쳐 둔 것
EL = os.path.join(SRC, 'elementals')
for name in ('water-priestess', 'wind-hashashin', 'ground-monk'):
    d = os.path.join(EL, name)
    if not os.path.isdir(d):
        continue
    m = {'idle': 'idle', 'run': 'run', 'attack': '1_atk', 'attack2': '2_atk', 'combo': '3_atk', 'special': 'sp_atk',
         'airAttack': 'air_atk', 'defend': 'defend', 'hurt': 'take_hit', 'death': 'death', 'roll': 'roll'}
    anims = {k: f'{d}/{v}.png' for k, v in m.items() if os.path.exists(f'{d}/{v}.png')}
    if 'run' not in anims:
        anims['run'] = f'{d}/idle.png'
    CHARS[name] = (288, 128, True, anims)

for c in (1, 2):
    d = f'{FK}/Colour{c}/Outline/120x80_PNGSheets'
    CHARS[f'fantasy-knight-{c}'] = (120, 80, True, {
        'idle': f'{d}/_Idle.png', 'run': f'{d}/_Run.png', 'attack': f'{d}/_AttackNoMovement.png', 'attack2': f'{d}/_Attack2NoMovement.png',
        'combo': f'{d}/_AttackComboNoMovement.png', 'hurt': f'{d}/_Hit.png', 'death': f'{d}/_DeathNoMovement.png',
        'dash': f'{d}/_Dash.png', 'roll': f'{d}/_Roll.png', 'jump': f'{d}/_Jump.png', 'fall': f'{d}/_Fall.png', 'crouchAttack': f'{d}/_CrouchAttack.png',
    })
for name, folder, idle, move, extra in [
    ('skeleton', 'Skeleton', 'Idle', 'Walk', {'shield': 'Shield'}),
    ('goblin', 'Goblin', 'Idle', 'Run', {}),
    ('mushroom', 'Mushroom', 'Idle', 'Run', {}),
    ('flying-eye', 'Flying eye', 'Flight', 'Flight', {}),
]:
    anims = {
        'idle': f'{LM}/{folder}/{idle}.png', 'run': f'{LM}/{folder}/{move}.png', 'attack': f'{LM}/{folder}/Attack.png',
        'attack3': f'{LM13}/{folder}/Attack3.png', 'hurt': f'{LM}/{folder}/Take Hit.png', 'death': f'{LM}/{folder}/Death.png',
    }
    for k, v in extra.items():
        anims[k] = f'{LM}/{folder}/{v}.png'
    CHARS[name] = (150, 150, True, anims)
for name, n in [('bat', 8), ('slime', 10), ('ghost', 12), ('spider', 12), ('beetle', 8), ('bee', 8), ('fish', 8), ('bird', 8)]:
    CHARS[name] = (32, 32, True, {'idle': f'{SP}/{name}-32px_strip{n}.png'})

# 투사체 (Monster Creatures v1.3)
PROJECTILES = {
    'goblin-bomb': (f'{LM13}/Goblin/Bomb_sprite.png', 100, 100),
    'mushroom-spore': (f'{LM13}/Mushroom/Projectile_sprite.png', 50, 50),
    'eye-bolt': (f'{LM13}/Flying eye/projectile_sprite.png', 48, 48),
}


manifest = {}
for name, (fw, fh, faces_right, anims) in CHARS.items():
    loaded = {a: frames_of(p, fw, fh) for a, p in anims.items() if (p if isinstance(p, list) else os.path.exists(p))}
    # 모든 프레임을 겹친 테두리
    box = None
    for fr in loaded.values():
        for f in fr:
            b = f.getbbox()
            if not b:
                continue
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    info = {'w': w, 'h': h, 'anims': {}}
    # 대기 동작 몸통 가운데 (달려가 멈출 위치, 발 위치 계산용)
    idle0 = loaded['idle'][0].crop(box).getbbox()
    info['bodyX'] = round(((idle0[0] + idle0[2]) / 2) if idle0 else w / 2)
    for a, fr in loaded.items():
        strip = Image.new('RGBA', (w * len(fr), h))
        reach = []
        for i, f in enumerate(fr):
            c = f.crop(box)
            strip.paste(c, (i * w, 0))
            bb = c.getbbox()
            reach.append(bb[2] if bb else 0)
        strip.save(os.path.join(OUT, name, f'{a}.png'), optimize=True)
        entry = {'frames': len(fr)}
        if a.startswith('attack') or a in ('combo', 'crouchAttack', 'special', 'airAttack', 'cast'):
            entry['hit'] = max(range(len(reach)), key=lambda i: reach[i])
        info['anims'][a] = entry
    manifest[name] = info
    print(f'{name:18} {w:3}x{h:<3} ' + ' '.join(f"{a}:{e['frames']}{'*' + str(e['hit']) if 'hit' in e else ''}" for a, e in info['anims'].items()))

proj = {}
for name, (p, fw, fh) in PROJECTILES.items():
    if not os.path.exists(p):
        continue
    fr = frames_of(p, fw, fh)
    os.makedirs(os.path.join(OUT, 'projectiles'), exist_ok=True)
    strip = Image.new('RGBA', (fw * len(fr), fh))
    for i, f in enumerate(fr):
        strip.paste(f, (i * fw, 0))
    strip.save(os.path.join(OUT, 'projectiles', f'{name}.png'), optimize=True)
    proj[name] = {'w': fw, 'h': fh, 'frames': len(fr)}
    print(f'{name:18} {fw}x{fh} frames:{len(fr)}')

with open(MANIFEST, 'w') as f:
    f.write('// 자동 생성: scripts/pack_sprites.py — 직접 고치지 마세요\n')
    f.write('export const SPRITES = ' + json.dumps(manifest, indent=4) + ' as const;\n\n')
    f.write('export const PROJECTILES = ' + json.dumps(proj, indent=4) + ' as const;\n')
