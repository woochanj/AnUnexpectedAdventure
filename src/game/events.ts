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
    /** 본문. 이야기 진행에 따라 달라지면 함수 */
    text: string | ((run: RunState) => string);
    choices: EventChoice[];
}

const flag = (r: RunState, k: string) => r.story?.flags[k] ?? 0;
const setFlag = (r: RunState, k: string, v: number) => {
    r.story = r.story ?? { flags: {} };
    r.story.flags[k] = v;
};

// ───────────── 길 위의 랜덤 인카운터 (지도에서 이동할 때 가끔) ─────────────
const ENCOUNTERS: EventDef[] = [
    {
        id: 'enc_ambush',
        title: '매복!',
        text: '덤불이 흔들리더니 길을 막고 무언가가 튀어나온다. 피하기엔 너무 가깝다.',
        choices: [
            { label: '맞서 싸운다', hint: '전투', run: (r, api) => (api.startFight(ambush(r.floor), false), null) },
            { label: '뒤도 안 보고 달린다', hint: '체력 6 잃음', run: (_r, api) => (api.loseHp(6), '등에 상처를 입었지만 겨우 따돌렸다.') },
        ],
    },
    {
        id: 'enc_peddler',
        title: '떠돌이 행상',
        text: '커다란 짐을 진 행상이 길가에 앉아 쉬고 있다. "싸게 줄게, 싸게. 이런 데선 다들 급하잖아?"',
        choices: [
            { label: '수상한 비전서', hint: '골드 45 — 고급 카드 1장', enabled: (r) => r.gold >= 45, run: (_r, api) => (api.gainGold(-45), `[${api.addRandomCard('uncommon')}]을(를) 손에 넣었다.`) },
            { label: '약초 꾸러미', hint: '골드 25 — 체력 14 회복', enabled: (r) => r.gold >= 25, run: (_r, api) => (api.gainGold(-25), api.heal(14), '쓴맛이 혀를 감싸고, 상처가 아물었다.') },
            { label: '그냥 지나간다', run: () => '"다음에 또 봐!" 행상은 손을 흔들었다.' },
        ],
    },
    {
        id: 'enc_goblin_thief',
        title: '보물 고블린',
        text: '금화 자루를 짊어진 고블린이 허둥지둥 달아난다. 자루에서 금화가 쨍그랑 떨어진다.',
        choices: [
            { label: '쫓아간다', hint: '고블린들과 전투 — 이기면 골드 넉넉히', run: (_r, api) => (api.startFight(['goblin', 'goblin_bomber'], false), null) },
            { label: '떨어진 금화만 줍는다', hint: '골드 18', run: (_r, api) => (api.gainGold(18), '길에 떨어진 금화를 주웠다.') },
        ],
    },
    {
        id: 'enc_traveler',
        title: '지친 여행자',
        text: '모닥불도 없이 웅크린 여행자가 있다. "지워진 땅에서 돌아오는 길이오... 먹을 것 좀 있소?"',
        choices: [
            { label: '식량을 나눈다', hint: '체력 5 잃고 카드 1장 강화', run: (_r, api) => {
                api.loseHp(5);
                const up = api.upgradeRandom(1);
                return `여행자가 답례로 지워진 땅의 요령을 알려 주었다.${up.length ? ` [${up[0]}] 강화됨.` : ''}`;
            } },
            { label: '길을 묻는다', hint: '이 지역 지도가 드러난다', run: (_r, api) => (api.revealMap(), '여행자가 손가락으로 땅바닥에 길을 그려 주었다.') },
            { label: '지나친다', run: () => '여행자의 기침 소리가 멀어졌다.' },
        ],
    },
    {
        id: 'enc_shrine',
        title: '길가의 작은 사당',
        text: '이끼 낀 작은 사당. 제단 위의 촛불이 바람도 없는데 흔들린다.',
        choices: [
            { label: '기도한다', hint: '무언가 일어난다', run: (_r, api) => {
                const roll = Math.random();
                if (roll < 0.45) return (api.heal(12), '따뜻한 빛이 몸을 감쌌다. 체력 12 회복.');
                if (roll < 0.8) return (api.gainGold(30), '제단 밑에서 누군가 두고 간 금화를 발견했다. 골드 30.');
                return (api.addCard('dread'), '촛불이 꺼지며 불길한 한기가 스며들었다. [불길한 예감] 저주가 덱에 들어왔다.');
            } },
            { label: '지나친다', run: () => '촛불이 등 뒤에서 조용히 흔들렸다.' },
        ],
    },
];

/** 지역별 매복 적 */
function ambush(floor: number): string[] {
    const pools = [
        [['slime_s', 'bat_s'], ['spider', 'spider'], ['goblin']],
        [['skeleton_s'], ['crow', 'crow'], ['ghost_s', 'bat_s']],
        [['void_goblin'], ['void_bee', 'void_bee'], ['void_skeleton']],
    ];
    const p = pools[Math.min(floor, 2)];
    return p[Math.floor(Math.random() * p.length)];
}

const LIST: EventDef[] = [
    // ── 지도 제작자 모렐: 지역마다 한 번씩 다시 만난다. 앞에서 어떻게 대했는지에 따라 달라진다 ──
    {
        id: 'moren_1',
        title: '바위 밑의 지도 제작자',
        text: '무너진 바위 아래에 누군가 깔려 있다. 품에 꼭 쥔 두루마리 지도만은 멀쩡하다. "거기... 누구요? 이것 좀... 치워 주시오..."',
        choices: [
            {
                label: '바위를 들어 올린다',
                hint: '체력 6 잃음 — 그는 은혜를 기억할 것이다',
                run: (r, api) => {
                    api.loseHp(6);
                    setFlag(r, 'moren', 1);
                    return '"고맙소! 나는 모렐, 지도 제작자요. 지워진 땅을 그리러 왔다가 이 꼴이 됐지." 그는 다음 지역에서 다시 보자며 절뚝이며 떠났다.';
                },
            },
            {
                label: '지도만 챙긴다',
                hint: '골드 35 — 그는 이 일을 잊지 않을 것이다',
                run: (r, api) => {
                    api.gainGold(35);
                    setFlag(r, 'moren', -1);
                    return '두루마리를 빼내 팔 만한 곳을 떠올렸다. 바위 밑에서 원망 섞인 목소리가 들렸다. "기억하겠소... 당신 얼굴..."';
                },
            },
            { label: '지나친다', run: (r) => (setFlag(r, 'moren', 0), '뒤에서 들리는 신음을 모른 척했다. 잠시 뒤, 누군가 스스로 빠져나오는 소리가 났다.') },
        ],
    },
    {
        id: 'moren_2',
        title: '다시 만난 모렐',
        text: (r) =>
            flag(r, 'moren') > 0
                ? '"오, 은인이로군!" 모렐이 모닥불 옆에서 손을 흔든다. 그의 지도에는 이 지역의 길이 절반쯤 그려져 있다.'
                : flag(r, 'moren') < 0
                  ? '"당신이군." 모렐이 칼을 쥔 용병 둘과 함께 길을 막아선다. "내 지도, 값을 치르시오."'
                  : '지쳐 쓰러진 모렐이 벽에 기대 있다. "물... 물 좀..." 그는 당신을 알아보지 못한다.',
        choices: [
            {
                label: '지도를 맞춰 본다',
                hint: '이 지역 지도가 드러나고 카드 1장 강화',
                enabled: (r) => flag(r, 'moren') > 0,
                run: (r, api) => {
                    api.revealMap();
                    const up = api.upgradeRandom(1);
                    setFlag(r, 'moren', 2);
                    return `두 사람의 지도를 겹치자 길이 또렷해졌다.${up.length ? ` [${up[0]}] 강화됨.` : ''} "끝에서 다시 봅시다. 마지막 장은 함께 그립시다."`;
                },
            },
            {
                label: '값을 치른다',
                hint: '골드 50 — 화해한다',
                enabled: (r) => flag(r, 'moren') < 0 && r.gold >= 50,
                run: (r, api) => {
                    api.gainGold(-50);
                    setFlag(r, 'moren', 1);
                    return '모렐은 금화를 세어 보더니 용병들을 물렸다. "...다음엔 바위부터 치워 주시오."';
                },
            },
            {
                label: '맞서 싸운다',
                hint: '강적과 전투',
                enabled: (r) => flag(r, 'moren') < 0,
                run: (r, api) => {
                    setFlag(r, 'moren', -2);
                    api.startFight(r.floor >= 1 ? ['skeleton_s', 'goblin'] : ['goblin', 'goblin'], true);
                    return null;
                },
            },
            {
                label: '물을 나눠 준다',
                hint: '체력 8 잃고 희귀 카드 1장',
                enabled: (r) => flag(r, 'moren') === 0,
                run: (r, api) => {
                    api.loseHp(8);
                    const name = api.addRandomCard('rare');
                    setFlag(r, 'moren', 1);
                    return `모렐이 숨을 돌리고 낡은 비망록을 건넨다. 그 속에서 [${name}]의 비법을 익혔다. "은혜는 끝에서 갚겠소."`;
                },
            },
            { label: '지나친다', run: () => '모렐을 뒤로하고 길을 재촉했다.' },
        ],
    },
    {
        id: 'moren_3',
        title: '지도의 마지막 장',
        text: (r) =>
            flag(r, 'moren') > 0
                ? '모렐이 거의 완성된 지도를 펼친다. "그림자의 둥지가 여기요. 이 길로 가면 돌아올 수도 있을 거요." 그의 눈이 젖어 있다.'
                : '모렐이 머물던 자리에 낡은 배낭만 남아 있다. 펼쳐진 일지의 마지막 장에는 "여기까지"라고만 적혀 있다.',
        choices: [
            {
                label: '지도를 받아 든다',
                hint: '체력 20 회복, 유물 1개',
                enabled: (r) => flag(r, 'moren') > 0,
                run: (_r, api) => {
                    api.heal(20);
                    const relic = api.gainRandomRelic();
                    return `모렐의 지도에는 숨겨진 쉼터와 보물이 표시되어 있었다.${relic ? ` [${relic}] 획득.` : ''} "그림자를 걷어 내면, 이 지도에 당신 이름을 적겠소."`;
                },
            },
            {
                label: '배낭을 뒤진다',
                hint: '골드 60',
                enabled: (r) => flag(r, 'moren') <= 0,
                run: (_r, api) => {
                    api.gainGold(60);
                    return '배낭 밑바닥에서 금화 주머니가 나왔다. 일지는 덮어 제자리에 두었다.';
                },
            },
            { label: '묵념하고 떠난다', run: (_r, api) => (api.heal(8), '잠시 눈을 감았다. 이상하게 발걸음이 가벼워졌다.') },
        ],
    },
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

export const EVENTS: Record<string, EventDef> = Object.fromEntries([...LIST, ...ENCOUNTERS].map((e) => [e.id, e]));
export const EVENT_IDS = LIST.map((e) => e.id);

export const ENCOUNTER_IDS = ENCOUNTERS.map((e) => e.id);
