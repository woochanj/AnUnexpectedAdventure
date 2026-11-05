import type { EnemyDef } from './types';

const LIST: EnemyDef[] = [
    // ── 1층: 고블린 굴 ──
    {
        id: 'blob', name: '역청 덩어리', look: { kind: 'ooze' }, hp: [11, 14], random: true,
        moves: [{ attack: 5 }, { attack: 3, debuff: { status: 'weak', amount: 1 } }, { block: 5, attack: 2 }],
    },
    {
        id: 'goblin_spear', name: '익사한 시체', look: { kind: 'ghoul' }, hp: [19, 23],
        moves: [{ attack: 7 }, { block: 6, attack: 3 }, { attack: 9 }],
    },
    {
        id: 'goblin_archer', name: '동굴 가고일', look: { kind: 'gargoyle' }, hp: [14, 17],
        moves: [{ attack: 3, hits: 2 }, { attack: 6 }, { debuff: { status: 'vulnerable', amount: 2 } }],
    },
    {
        id: 'imp', name: '굶주린 쥐', look: { kind: 'rat' }, hp: [12, 15], random: true,
        moves: [{ buff: { status: 'strength', amount: 2 } }, { attack: 5 }, { attack: 4, hits: 2 }],
    },
    {
        id: 'goblin_brute', name: '부풀어 오른 익사체', look: { kind: 'ghoul', scale: 4 }, hp: [44, 48], size: 'large',
        moves: [{ attack: 12 }, { block: 10, attack: 5 }, { buff: { status: 'strength', amount: 3 } }, { attack: 6, hits: 2 }],
    },
    {
        id: 'goblin_chief', name: '익사한 기사', look: { kind: 'knight', variant: 'drowned', scale: 4 }, hp: [78, 78], size: 'huge', enrage: 3,
        moves: [
            { attack: 7, hits: 2 },
            { block: 14, buff: { status: 'strength', amount: 2 } },
            { attack: 14 },
            { debuff: { status: 'weak', amount: 2 }, attack: 6 },
        ],
    },

    // ── 2층: 안개 묘지 ──
    {
        id: 'skeleton', name: '해골 병사', look: { kind: 'skeleton' }, hp: [28, 32],
        moves: [{ attack: 10 }, { block: 10, attack: 4 }, { attack: 5, hits: 2 }],
    },
    {
        id: 'bones', name: '불타는 해골', look: { kind: 'flameskull' }, hp: [15, 18], random: true,
        moves: [{ attack: 6 }, { attack: 3, hits: 3 }],
    },
    {
        id: 'witch_ghost', name: '저주받은 수도사', look: { kind: 'cultist', variant: 'crimson' }, hp: [22, 26],
        moves: [{ debuff: { status: 'vulnerable', amount: 2 } }, { attack: 9 }, { curse: 2, attack: 4 }],
    },
    {
        id: 'drop_ghost', name: '안개 망령', look: { kind: 'wraith' }, hp: [20, 24], random: true,
        moves: [{ attack: 8 }, { block: 8 }, { healAll: 6 }],
    },
    {
        id: 'maid', name: '원한령', look: { kind: 'wraith', variant: 'crimson' }, hp: [30, 34],
        moves: [{ attack: 6, hits: 2 }, { buff: { status: 'strength', amount: 2 }, block: 6 }, { attack: 13 }],
    },
    {
        id: 'black_knight', name: '검은 해골 기사', look: { kind: 'knight', variant: 'bone', scale: 4 }, hp: [76, 80], size: 'large',
        moves: [{ attack: 18 }, { block: 16, buff: { status: 'strength', amount: 2 } }, { attack: 8, hits: 2 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 8 }],
    },
    {
        id: 'old_shaman', name: '감시자의 눈', look: { kind: 'eye', scale: 5 }, hp: [118, 118], size: 'huge', enrage: 3,
        moves: [
            { debuff: { status: 'weak', amount: 2 }, block: 12, curse: 1 },
            { attack: 10, hits: 2 },
            { buff: { status: 'strength', amount: 2 }, healAll: 8 },
            { attack: 20 },
            { debuff: { status: 'vulnerable', amount: 2 }, attack: 10 },
        ],
    },

    // ── 3층: 그림자 성채 ──
    {
        id: 'wraith', name: '공허 가고일', look: { kind: 'gargoyle', variant: 'void' }, hp: [36, 40],
        moves: [{ attack: 12 }, { debuff: { status: 'weak', amount: 2 }, attack: 6 }, { attack: 5, hits: 3 }],
    },
    {
        id: 'violet_priest', name: '공허의 사제', look: { kind: 'cultist', variant: 'void' }, hp: [38, 42],
        moves: [{ healAll: 10, block: 8 }, { attack: 10 }, { curse: 2, attack: 6 }],
    },
    {
        id: 'pumpkin', name: '저주받은 해골', look: { kind: 'flameskull', variant: 'void' }, hp: [44, 48], random: true,
        moves: [{ attack: 14 }, { block: 14 }, { attack: 7, hits: 2 }],
    },
    {
        id: 'shade_wraith', name: '공허 망령', look: { kind: 'wraith', variant: 'void' }, hp: [32, 36],
        moves: [{ attack: 4, hits: 3 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 7 }, { attack: 9, drain: true }],
    },
    {
        id: 'imp_lord', name: '공허의 눈', look: { kind: 'eye', variant: 'void', scale: 4 }, hp: [100, 104], size: 'large',
        moves: [{ attack: 9, hits: 2 }, { buff: { status: 'strength', amount: 3 }, block: 12 }, { attack: 16, drain: true }, { debuff: { status: 'weak', amount: 2 }, attack: 9 }],
    },
    {
        id: 'endless_shadow', name: '끝없는 그림자', look: { kind: 'knight', variant: 'shadow', crown: true, scale: 5 }, hp: [165, 165], size: 'huge', enrage: 3,
        moves: [
            { attack: 11, hits: 2 },
            { block: 18, buff: { status: 'strength', amount: 2 }, curse: 2 },
            { debuff: { status: 'vulnerable', amount: 2 }, attack: 9 },
            { attack: 4, hits: 5 },
            { attack: 23 },
        ],
    },

    // ── 받은 스프라이트 에셋으로 그린 적 (LuizMelo · SpritePilot, CC0) ──
    // 1층
    {
        id: 'slime_s', name: '분홍 슬라임', look: { kind: 'sprite', sprite: 'slime', scale: 4 }, hp: [10, 13], random: true,
        moves: [{ attack: 5 }, { attack: 3, debuff: { status: 'weak', amount: 1 } }, { block: 5, attack: 2 }],
    },
    {
        id: 'fish', name: '이빨 물고기', look: { kind: 'sprite', sprite: 'fish', scale: 4 }, hp: [9, 12], random: true,
        moves: [{ attack: 4, hits: 2 }, { attack: 6 }],
    },
    {
        id: 'beetle', name: '바위 딱정벌레', look: { kind: 'sprite', sprite: 'beetle', scale: 4 }, hp: [16, 19],
        moves: [{ block: 7, attack: 3 }, { attack: 8 }],
    },
    {
        id: 'spider', name: '동굴 거미', look: { kind: 'sprite', sprite: 'spider', scale: 4 }, hp: [13, 16],
        moves: [{ debuff: { status: 'poison', amount: 3 }, attack: 3 }, { attack: 7 }],
    },
    {
        id: 'bat_s', name: '동굴 박쥐', look: { kind: 'sprite', sprite: 'bat', scale: 4 }, hp: [11, 13], random: true,
        moves: [{ attack: 3, hits: 2 }, { attack: 5, drain: true }],
    },
    {
        id: 'goblin', name: '고블린 약탈자', look: { kind: 'sprite', sprite: 'goblin', scale: 3 }, hp: [20, 24],
        moves: [{ attack: 7 }, { attack: 4, hits: 2 }, { block: 6, attack: 3 }],
    },
    {
        id: 'goblin_bomber', name: '폭탄 고블린', look: { kind: 'sprite', sprite: 'goblin', scale: 3, ranged: 'goblin-bomb', filter: 'hue-rotate(-40deg) saturate(1.3)' }, hp: [16, 19],
        moves: [{ attack: 10 }, { buff: { status: 'strength', amount: 2 } }, { attack: 6 }],
    },
    {
        id: 'mushroom_big', name: '거대 버섯', look: { kind: 'sprite', sprite: 'mushroom', scale: 4, ranged: 'mushroom-spore' }, hp: [46, 50], size: 'large',
        moves: [{ attack: 8, debuff: { status: 'poison', amount: 3 } }, { attack: 12 }, { block: 10, buff: { status: 'strength', amount: 2 } }],
    },
    // 2층
    {
        id: 'skeleton_s', name: '해골 검사', look: { kind: 'sprite', sprite: 'skeleton', scale: 3 }, hp: [28, 32],
        moves: [{ attack: 10 }, { block: 12 }, { attack: 5, hits: 2 }],
    },
    {
        id: 'ghost_s', name: '떠도는 유령', look: { kind: 'sprite', sprite: 'ghost', scale: 4 }, hp: [18, 22], random: true,
        moves: [{ debuff: { status: 'vulnerable', amount: 2 } }, { attack: 7, drain: true }, { attack: 4, hits: 2 }],
    },
    {
        id: 'crow', name: '안개 까마귀', look: { kind: 'sprite', sprite: 'bird', scale: 4, filter: 'saturate(0.35) brightness(0.75)' }, hp: [14, 17], random: true,
        moves: [{ attack: 3, hits: 3 }, { attack: 7 }],
    },
    {
        id: 'flying_eye', name: '날아다니는 눈', look: { kind: 'sprite', sprite: 'flying-eye', scale: 3, ranged: 'eye-bolt' }, hp: [22, 26],
        moves: [{ attack: 9 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 4 }],
    },
    // 3층
    {
        id: 'void_skeleton', name: '공허 해골', look: { kind: 'sprite', sprite: 'skeleton', scale: 3, filter: 'hue-rotate(230deg) saturate(1.4)' }, hp: [40, 44],
        moves: [{ attack: 13 }, { block: 14, buff: { status: 'strength', amount: 1 } }, { attack: 6, hits: 2 }],
    },
    {
        id: 'void_goblin', name: '공허 고블린', look: { kind: 'sprite', sprite: 'goblin', scale: 3, filter: 'hue-rotate(200deg) saturate(1.3)' }, hp: [36, 40],
        moves: [{ attack: 6, hits: 2 }, { attack: 14 }, { debuff: { status: 'weak', amount: 2 }, attack: 5 }],
    },
    {
        id: 'void_bee', name: '공허 말벌', look: { kind: 'sprite', sprite: 'bee', scale: 4, filter: 'hue-rotate(220deg) saturate(1.3)' }, hp: [24, 28], random: true,
        moves: [{ attack: 3, hits: 3 }, { debuff: { status: 'poison', amount: 4 } }, { attack: 9 }],
    },
    {
        id: 'void_eye', name: '공허의 눈동자', look: { kind: 'sprite', sprite: 'flying-eye', scale: 3, ranged: 'eye-bolt', filter: 'hue-rotate(200deg) saturate(1.4)' }, hp: [34, 38],
        moves: [{ attack: 12 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 6 }, { healAll: 8 }],
    },
    {
        id: 'void_mushroom', name: '공허 버섯', look: { kind: 'sprite', sprite: 'mushroom', scale: 4, ranged: 'mushroom-spore', filter: 'hue-rotate(220deg) saturate(1.3)' }, hp: [96, 100], size: 'large',
        moves: [{ attack: 10, debuff: { status: 'poison', amount: 4 } }, { attack: 18 }, { block: 14, buff: { status: 'strength', amount: 3 } }, { attack: 7, hits: 2 }],
    },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(LIST.map((e) => [e.id, e]));

export interface FloorTheme {
    name: string;
    subtitle: string;
    encounters: string[][];
    elites: string[][];
    boss: string[];
}

export const FLOORS: FloorTheme[] = [
    {
        name: '잠긴 동굴',
        subtitle: '물에 잠긴 동굴, 빛이 물결 따라 일렁인다',
        encounters: [
            ['slime_s', 'slime_s'], ['goblin'], ['fish', 'fish'], ['spider', 'bat_s'], ['beetle'], ['blob', 'slime_s'],
            ['goblin', 'goblin_bomber'], ['goblin_spear'], ['goblin_archer', 'bat_s'], ['imp', 'imp'],
        ],
        elites: [['mushroom_big'], ['goblin_brute']],
        boss: ['goblin_chief'],
    },
    {
        name: '안개 묘지',
        subtitle: '이름 모를 묘비들 사이로 안개가 흐른다',
        encounters: [
            ['skeleton_s'], ['ghost_s', 'ghost_s'], ['crow', 'crow', 'crow'], ['flying_eye', 'skeleton_s'], ['skeleton'],
            ['bones', 'ghost_s'], ['witch_ghost', 'flying_eye'], ['drop_ghost', 'skeleton_s'], ['maid'],
        ],
        elites: [['black_knight']],
        boss: ['old_shaman'],
    },
    {
        name: '그림자 성채',
        subtitle: '빛이 닿지 않는 곳, 무언가 숨 쉬고 있다',
        encounters: [
            ['void_skeleton', 'void_goblin'], ['void_bee', 'void_bee', 'void_bee'], ['void_eye', 'violet_priest'], ['wraith', 'shade_wraith'],
            ['pumpkin', 'void_skeleton'], ['void_goblin', 'void_bee'], ['violet_priest', 'pumpkin'],
        ],
        elites: [['imp_lord'], ['void_mushroom']],
        boss: ['endless_shadow'],
    },
];
