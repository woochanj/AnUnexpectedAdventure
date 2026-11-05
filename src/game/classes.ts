import type { ClassId } from './types';

export interface ClassDef {
    id: ClassId;
    name: string;
    desc: string;
    hp: number;
    deck: string[];
    /** 고를 수 있는 모습 (ui/Actors.tsx HEROES의 id). 첫 번째가 기본 */
    looks: string[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
    knight: {
        id: 'knight',
        name: '기사',
        desc: '단단한 방어와 묵직한 일격. 힘을 쌓아 버틴다.',
        hp: 80,
        deck: ['slash', 'slash', 'slash', 'slash', 'slash', 'guard', 'guard', 'guard', 'guard', 'torch_swing'],
        looks: ['hero-knight', 'fantasy-knight-1', 'fantasy-knight-2', 'cat-knight'],
    },
    mage: {
        id: 'mage',
        name: '마법사',
        desc: '화염·냉기·번개 주문으로 멀리서 적을 쓸어버린다. 체력이 낮다.',
        hp: 62,
        deck: ['spark', 'spark', 'spark', 'spark', 'ward', 'ward', 'ward', 'ward', 'frost_bolt', 'focus'],
        looks: ['wizard'],
    },
    rogue: {
        id: 'rogue',
        name: '도적',
        desc: '빠른 연속 공격과 독. 카드를 많이 뽑아 몰아친다.',
        hp: 68,
        deck: ['stab', 'stab', 'stab', 'stab', 'stab', 'dodge', 'dodge', 'dodge', 'dodge', 'poison_stab'],
        looks: ['martial-hero'],
    },
};

export const CLASS_IDS: ClassId[] = ['knight', 'mage', 'rogue'];
