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
        id: 'goblin_chief', name: '익사한 기사', look: { kind: 'knight', variant: 'drowned', scale: 4 }, hp: [88, 88], size: 'huge',
        moves: [
            { attack: 7, hits: 2 },
            { block: 14, buff: { status: 'strength', amount: 2 } },
            { attack: 16 },
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
        moves: [{ debuff: { status: 'vulnerable', amount: 2 } }, { attack: 9 }, { debuff: { status: 'weak', amount: 2 }, attack: 4 }],
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
        id: 'old_shaman', name: '감시자의 눈', look: { kind: 'eye', scale: 5 }, hp: [150, 150], size: 'huge',
        moves: [
            { debuff: { status: 'weak', amount: 2 }, block: 12 },
            { attack: 11, hits: 2 },
            { buff: { status: 'strength', amount: 3 }, healAll: 10 },
            { attack: 24 },
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
        moves: [{ healAll: 10, block: 8 }, { attack: 10 }, { buff: { status: 'strength', amount: 2 }, attack: 6 }],
    },
    {
        id: 'pumpkin', name: '저주받은 해골', look: { kind: 'flameskull', variant: 'void' }, hp: [44, 48], random: true,
        moves: [{ attack: 14 }, { block: 14 }, { attack: 7, hits: 2 }],
    },
    {
        id: 'shade_wraith', name: '공허 망령', look: { kind: 'wraith', variant: 'void' }, hp: [32, 36],
        moves: [{ attack: 4, hits: 3 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 7 }],
    },
    {
        id: 'imp_lord', name: '공허의 눈', look: { kind: 'eye', variant: 'void', scale: 4 }, hp: [100, 104], size: 'large',
        moves: [{ attack: 9, hits: 2 }, { buff: { status: 'strength', amount: 3 }, block: 12 }, { attack: 22 }, { debuff: { status: 'weak', amount: 2 }, attack: 9 }],
    },
    {
        id: 'endless_shadow', name: '끝없는 그림자', look: { kind: 'knight', variant: 'shadow', crown: true, scale: 5 }, hp: [240, 240], size: 'huge',
        moves: [
            { attack: 14, hits: 2 },
            { block: 20, buff: { status: 'strength', amount: 3 } },
            { debuff: { status: 'vulnerable', amount: 3 }, attack: 10 },
            { attack: 6, hits: 5 },
            { attack: 32 },
        ],
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
        encounters: [['blob', 'blob'], ['goblin_spear'], ['goblin_archer', 'blob'], ['imp', 'imp'], ['goblin_spear', 'goblin_archer']],
        elites: [['goblin_brute']],
        boss: ['goblin_chief'],
    },
    {
        name: '안개 묘지',
        subtitle: '이름 모를 묘비들 사이로 안개가 흐른다',
        encounters: [['skeleton'], ['bones', 'bones', 'bones'], ['witch_ghost', 'bones'], ['drop_ghost', 'skeleton'], ['maid']],
        elites: [['black_knight']],
        boss: ['old_shaman'],
    },
    {
        name: '그림자 성채',
        subtitle: '빛이 닿지 않는 곳, 무언가 숨 쉬고 있다',
        encounters: [['wraith', 'shade_wraith'], ['violet_priest', 'pumpkin'], ['pumpkin'], ['shade_wraith', 'shade_wraith', 'shade_wraith'], ['wraith', 'violet_priest']],
        elites: [['imp_lord']],
        boss: ['endless_shadow'],
    },
];
