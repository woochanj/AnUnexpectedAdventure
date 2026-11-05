import type { EnemyDef } from './types';

// 생물 색 변주 (어두운 색 → 밝은 색 순서)
const LAVA = ['#2a0804', '#5a1408', '#9a2a0c', '#d8541a', '#ff8a2a', '#ffc24a', '#fff0a0'];
const TEAL = ['#04161c', '#0a3038', '#10545e', '#1a8a8a', '#3ac4b4', '#8af0dc', '#e6fff8'];
const CRIMSON = ['#1a040a', '#3e0a16', '#701428', '#a82640', '#e04a5e', '#ff9aa4', '#ffe6ea'];
const VIOLET = ['#0e0618', '#241040', '#3e1a6a', '#6a2ea0', '#9a52d0', '#c99af0', '#f2e2ff'];
const VIOLET_FIRE = ['#12041e', '#2e0a48', '#5a1478', '#8a2ab0', '#b45ae0', '#dc9af6', '#f8e0ff', '#ffffff'];

const LIST: EnemyDef[] = [
    // ── 1층: 고블린 굴 ──
    {
        id: 'blob', name: '초록 슬라임', look: { fx: 'critters/slime' }, hp: [11, 14], random: true,
        moves: [{ attack: 5 }, { attack: 3, debuff: { status: 'weak', amount: 1 } }, { block: 5, attack: 2 }],
    },
    {
        id: 'goblin_spear', name: '독두꺼비', look: { fx: 'critters/frog', scale: 5 }, hp: [19, 23],
        moves: [{ attack: 7 }, { block: 6, attack: 3 }, { attack: 9 }],
    },
    {
        id: 'goblin_archer', name: '동굴 박쥐', look: { fx: 'critters/bat' }, hp: [14, 17],
        moves: [{ attack: 3, hits: 2 }, { attack: 6 }, { debuff: { status: 'vulnerable', amount: 2 } }],
    },
    {
        id: 'imp', name: '이끼 뱀', look: { fx: 'critters/snake' }, hp: [12, 15], random: true,
        moves: [{ buff: { status: 'strength', amount: 2 } }, { attack: 5 }, { attack: 4, hits: 2 }],
    },
    {
        id: 'goblin_brute', name: '용암 슬라임', look: { fx: 'critters/slime', scale: 5, palette: LAVA }, hp: [44, 48], size: 'large',
        moves: [{ attack: 12 }, { block: 10, attack: 5 }, { buff: { status: 'strength', amount: 3 } }, { attack: 6, hits: 2 }],
    },
    {
        id: 'goblin_chief', name: '불꽃 해골 왕', look: { fx: 'critters/flying-skull', scale: 5 }, hp: [88, 88], size: 'huge',
        moves: [
            { attack: 7, hits: 2 },
            { block: 14, buff: { status: 'strength', amount: 2 } },
            { attack: 16 },
            { debuff: { status: 'weak', amount: 2 }, attack: 6 },
        ],
    },

    // ── 2층: 안개 묘지 ──
    {
        id: 'skeleton', name: '떠도는 유령', look: { fx: 'critters/ghost' }, hp: [28, 32],
        moves: [{ attack: 10 }, { block: 10, attack: 4 }, { attack: 5, hits: 2 }],
    },
    {
        id: 'bones', name: '도깨비불', look: { fx: 'critters/wisp', scale: 3 }, hp: [15, 18], random: true,
        moves: [{ attack: 6 }, { attack: 3, hits: 3 }],
    },
    {
        id: 'witch_ghost', name: '핏발 눈알', look: { fx: 'critters/eyeball' }, hp: [22, 26],
        moves: [{ debuff: { status: 'vulnerable', amount: 2 } }, { attack: 9 }, { debuff: { status: 'weak', amount: 2 }, attack: 4 }],
    },
    {
        id: 'drop_ghost', name: '안개 해파리', look: { fx: 'critters/jellyfish', palette: TEAL }, hp: [20, 24], random: true,
        moves: [{ attack: 8 }, { block: 8 }, { healAll: 6 }],
    },
    {
        id: 'maid', name: '원한령', look: { fx: 'critters/ghost', palette: CRIMSON }, hp: [30, 34],
        moves: [{ attack: 6, hits: 2 }, { buff: { status: 'strength', amount: 2 }, block: 6 }, { attack: 13 }],
    },
    {
        id: 'black_knight', name: '거대 유령', look: { fx: 'critters/ghost', scale: 6, palette: VIOLET }, hp: [76, 80], size: 'large',
        moves: [{ attack: 18 }, { block: 16, buff: { status: 'strength', amount: 2 } }, { attack: 8, hits: 2 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 8 }],
    },
    {
        id: 'old_shaman', name: '감시자의 눈', look: { fx: 'critters/eyeball', scale: 7 }, hp: [150, 150], size: 'huge',
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
        id: 'wraith', name: '그림자 뱀', look: { fx: 'critters/snake', palette: VIOLET }, hp: [36, 40],
        moves: [{ attack: 12 }, { debuff: { status: 'weak', amount: 2 }, attack: 6 }, { attack: 5, hits: 3 }],
    },
    {
        id: 'violet_priest', name: '공허 해파리', look: { fx: 'critters/jellyfish' }, hp: [38, 42],
        moves: [{ healAll: 10, block: 8 }, { attack: 10 }, { buff: { status: 'strength', amount: 2 }, attack: 6 }],
    },
    {
        id: 'pumpkin', name: '저주받은 해골', look: { fx: 'critters/flying-skull', palette: VIOLET_FIRE }, hp: [44, 48], random: true,
        moves: [{ attack: 14 }, { block: 14 }, { attack: 7, hits: 2 }],
    },
    {
        id: 'shade_wraith', name: '공허 도깨비불', look: { fx: 'critters/wisp', scale: 3, palette: VIOLET }, hp: [32, 36],
        moves: [{ attack: 4, hits: 3 }, { debuff: { status: 'vulnerable', amount: 2 }, attack: 7 }],
    },
    {
        id: 'imp_lord', name: '비전 감시자', look: { fx: 'arcane/arcane-orb', scale: 3 }, hp: [100, 104], size: 'large',
        moves: [{ attack: 9, hits: 2 }, { buff: { status: 'strength', amount: 3 }, block: 12 }, { attack: 22 }, { debuff: { status: 'weak', amount: 2 }, attack: 9 }],
    },
    {
        id: 'endless_shadow', name: '끝없는 그림자', look: { fx: 'shadow/void-orb', scale: 3 }, hp: [240, 240], size: 'huge',
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
