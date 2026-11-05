import type { RunState } from './types';

/** 이벤트 선택지가 게임 상태를 바꿀 때 쓰는 도구들 (run.ts에서 주입) */
export interface EventApi {
    gainGold(n: number): void;
    loseHp(n: number): void;
    heal(n: number): void;
    gainMaxHp(n: number): void;
    addRandomCard(rarity: 'common' | 'uncommon' | 'rare'): string;
    addCard(id: string): string;
    gainRandomRelic(): string | null;
    gainRelic(id: string): string;
    upgradeRandom(n: number): string[];
    openPick(purpose: 'upgrade' | 'remove'): void;
    startFight(enemies: string[], elite: boolean): void;
    revealMap(): void;
}

export interface EventChoice {
    label: string;
    hint?: string;
    enabled?: (run: RunState) => boolean;
    /** 결과 문장을 반환. 화면을 직접 바꿨다면 null */
    run: (run: RunState, api: EventApi) => string | null;
}

export interface EventDef {
    id: string;
    title: string;
    text: string;
    choices: EventChoice[];
}

const LIST: EventDef[] = [
    {
        id: 'mana_spring',
        title: '마나의 샘',
        text: '바위 틈에서 푸른 빛이 흘러나온다. 손을 담그자 손끝이 저릿하다. 이 물을 마시면 무언가를 얻고, 무언가를 잃을 것 같다.',
        choices: [
            {
                label: '샘물을 들이켠다',
                hint: '최대 체력 -12, 최대 에너지 +1',
                enabled: (r) => r.maxHp > 20,
                run: (r, api) => {
                    r.maxHp -= 12;
                    r.hp = Math.min(r.hp, r.maxHp);
                    api.gainRelic('mana_spring');
                    return '몸이 차갑게 식으며, 머릿속에 마력이 고였다. [샘의 축복] 획득 — 최대 에너지 +1.';
                },
            },
            {
                label: '얼굴만 씻는다',
                hint: '체력 15 회복',
                run: (_r, api) => {
                    api.heal(15);
                    return '맑은 물에 피로가 씻겨 내려갔다.';
                },
            },
            { label: '지나친다', run: () => '빛은 등 뒤에서 오래도록 일렁였다.' },
        ],
    },
    {
        id: 'spring',
        title: '빛나는 샘',
        text: '동굴 틈새에서 희미하게 빛나는 샘물이 솟아난다. 물맛이 묘하게 달다는 소문을 들은 적이 있다.',
        choices: [
            {
                label: '샘물을 마신다',
                hint: '체력 20 회복, 혹은…',
                run: (_r, api) => {
                    if (Math.random() < 0.7) {
                        api.heal(20);
                        return '시원한 기운이 온몸에 퍼진다. 체력을 20 회복했다.';
                    }
                    api.loseHp(7);
                    return '물에서 쇠맛이 난다. 속이 뒤틀려 체력을 7 잃었다.';
                },
            },
            {
                label: '얼굴만 씻는다',
                hint: '최대 체력 +4',
                run: (_r, api) => {
                    api.gainMaxHp(4);
                    return '정신이 맑아진다. 최대 체력이 4 늘었다.';
                },
            },
            { label: '지나친다', run: () => '괜히 탈이 날까 봐 발걸음을 옮겼다.' },
        ],
    },
    {
        id: 'merchant',
        title: '길 잃은 상인',
        text: '짐을 잔뜩 진 상인이 벽에 기대 쉬고 있다. "이봐, 모험가 양반. 특별한 물건이 하나 있는데…"',
        choices: [
            {
                label: '40골드를 낸다',
                hint: '희귀 카드 1장',
                enabled: (r) => r.gold >= 40,
                run: (_r, api) => {
                    api.gainGold(-40);
                    const name = api.addRandomCard('rare');
                    return `상인이 낡은 두루마리를 건넨다. [${name}] 카드를 얻었다.`;
                },
            },
            {
                label: '길을 알려준다',
                hint: '골드 25',
                run: (_r, api) => {
                    api.gainGold(25);
                    return '상인이 고맙다며 동전 몇 닢을 쥐여 준다. 25골드를 얻었다.';
                },
            },
        ],
    },
    {
        id: 'altar',
        title: '버려진 제단',
        text: '이끼 낀 제단 위에 피로 그린 문양이 아직 마르지 않았다. 손을 얹으면 무언가를 가져갈 것 같다.',
        choices: [
            {
                label: '피를 바친다',
                hint: '체력 8 잃고 카드 2장 강화',
                run: (_r, api) => {
                    api.loseHp(8);
                    const names = api.upgradeRandom(2);
                    return names.length
                        ? `문양이 붉게 빛난다. ${names.map((n) => `[${n}]`).join(', ')} 강화됨.`
                        : '문양이 빛났지만 강화할 카드가 없다.';
                },
            },
            {
                label: '기억을 바친다',
                hint: '카드 1장 제거',
                run: (_r, api) => {
                    api.openPick('remove');
                    return null;
                },
            },
            { label: '떠난다', run: () => '등 뒤로 서늘한 시선이 느껴졌다.' },
        ],
    },
    {
        id: 'chest',
        title: '수상한 상자',
        text: '방 한가운데 금장식 상자가 놓여 있다. 너무 눈에 띈다. 뚜껑 틈으로 무언가 꿈틀거린 것 같기도 하다.',
        choices: [
            {
                label: '연다',
                hint: '유물? 혹은 함정',
                run: (_r, api) => {
                    if (Math.random() < 0.5) {
                        const relic = api.gainRandomRelic();
                        if (relic) return `상자 안에서 [${relic}]을(를) 찾았다!`;
                        api.gainGold(60);
                        return '상자 가득 금화가! 60골드를 얻었다.';
                    }
                    api.startFight(['imp', 'imp'], false);
                    return null;
                },
            },
            { label: '건드리지 않는다', run: () => '현명한 선택일지도 모른다.' },
        ],
    },
    {
        id: 'map_fragment',
        title: '찢어진 지도',
        text: '해골이 쥐고 있는 양피지 조각. 이 층의 구조가 대충 그려져 있다.',
        choices: [
            {
                label: '지도를 읽는다',
                hint: '이 층의 모든 방 공개',
                run: (_r, api) => {
                    api.revealMap();
                    return '머릿속에 길이 그려진다. 이 층의 모든 방이 드러났다.';
                },
            },
            {
                label: '해골의 주머니를 뒤진다',
                hint: '골드 15~45',
                run: (_r, api) => {
                    const g = 15 + Math.floor(Math.random() * 31);
                    api.gainGold(g);
                    return `낡은 주머니에서 ${g}골드를 찾았다.`;
                },
            },
        ],
    },
    {
        id: 'trainer',
        title: '늙은 검사',
        text: '모닥불 옆에 앉은 노인이 당신의 자세를 훑어본다. "칼 쥐는 법부터 틀렸구먼. 가르쳐 줄까?"',
        choices: [
            {
                label: '가르침을 받는다',
                hint: '카드 1장 강화',
                run: (_r, api) => {
                    api.openPick('upgrade');
                    return null;
                },
            },
            {
                label: '대련을 청한다',
                hint: '체력 10 잃고 고급 카드 1장',
                run: (_r, api) => {
                    api.loseHp(10);
                    const name = api.addRandomCard('uncommon');
                    return `흠씬 두들겨 맞았지만 깨달음이 있었다. [${name}] 카드를 얻었다.`;
                },
            },
        ],
    },
    {
        id: 'mushrooms',
        title: '빛나는 버섯 군락',
        text: '푸르게 빛나는 버섯이 바닥을 뒤덮고 있다. 배가 고프다.',
        choices: [
            {
                label: '먹는다',
                hint: '최대 체력 +8, 체력 6 잃음',
                run: (_r, api) => {
                    api.gainMaxHp(8);
                    api.loseHp(6);
                    return '머리가 핑 돌지만 몸이 단단해진 느낌이다.';
                },
            },
            {
                label: '채집한다',
                hint: '독 관련 카드 획득',
                run: (_r, api) => {
                    const name = api.addCard(Math.random() < 0.5 ? 'venom_dagger' : 'poison_fog');
                    return `조심스럽게 포자를 모았다. [${name}] 카드를 얻었다.`;
                },
            },
        ],
    },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(LIST.map((e) => [e.id, e]));
export const EVENT_IDS = LIST.map((e) => e.id);
