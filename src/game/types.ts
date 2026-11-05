export type Status = 'strength' | 'vulnerable' | 'weak' | 'poison' | 'thorns' | 'regen' | 'energize' | 'frost' | 'burn';
export type StatusMap = Partial<Record<Status, number>>;

export type Effect =
    | { kind: 'damage'; amount: number; hits?: number }
    | { kind: 'damageAll'; amount: number; hits?: number }
    | { kind: 'block'; amount: number }
    | { kind: 'draw'; amount: number }
    | { kind: 'energy'; amount: number }
    | { kind: 'heal'; amount: number }
    | { kind: 'apply'; status: Status; amount: number; to: 'target' | 'all' | 'self' }
    | { kind: 'doublePoison' }
    /** 연계: 이번 턴 먼저 낸 카드 1장당 이 카드의 피해 +per */
    | { kind: 'combo'; per: number }
    /** 직전에 낸 카드가 type이면 effects를 추가로 */
    | { kind: 'after'; type: 'attack' | 'skill' | 'power'; effects: Effect[] }
    /** 현재 방어도만큼 피해 */
    | { kind: 'blockDamage' }
    /** 대상의 냉기 1당 피해 per, 냉기는 사라진다 */
    | { kind: 'shatter'; per: number }
    /** 이번 턴 앞서 낸 공격 카드 1장당 피해 per */
    | { kind: 'finisher'; per: number }
    /** 대상에게 status가 있으면 피해 +amount */
    | { kind: 'bonusVs'; status: Status; amount: number }
    /** 대상의 독/화상 수치 × mult 만큼 즉시 피해 */
    | { kind: 'detonate'; status: 'poison' | 'burn'; mult: number };

export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'unique';
export type ClassId = 'knight' | 'mage' | 'rogue';
export type CardType = 'attack' | 'skill' | 'power';

export interface CardDef {
    id: string;
    name: string;
    type: CardType;
    rarity: Rarity;
    cost: number;
    effects: Effect[];
    exhaust?: boolean;
    /** 어느 직업 카드인지 (neutral = 모두) */
    cls: ClassId | 'neutral';
    /** 원거리 공격 (주인공이 달려가지 않음) */
    ranged?: boolean;
    /** 강한 기술: 기를 모은 뒤 터진다 (연출 시간이 길어짐) */
    charge?: boolean;
    /** 궁극기: 더 길게 모으고 화면 전체 연출 */
    ultimate?: boolean;
    /** 낼 수 없는 카드 (저주). 턴이 끝날 때 손에 있으면 사라진다 */
    unplayable?: boolean;
    /** 강화 시 바뀌는 값 */
    up: { cost?: number; effects?: Effect[]; exhaust?: boolean };
}

export interface CardInst {
    uid: string;
    id: string;
    /** 레벨 2 이상이면 true (예전 저장과의 호환) */
    upgraded: boolean;
    /** 카드 레벨 1~3 */
    level?: number;
}

export interface Intent {
    attack?: number;
    hits?: number;
    block?: number;
    buff?: { status: Status; amount: number };
    debuff?: { status: Status; amount: number };
    healAll?: number;
    /** 막히지 않은 피해만큼 자신을 회복 */
    drain?: boolean;
    /** 저주 카드를 버린 카드 더미에 섞어 넣는다 */
    curse?: number;
}

/** 정예/보스에게 붙는 무작위 성향 */
export type Affix = 'brutal' | 'tough' | 'spiky' | 'regen' | 'venom';

export interface EnemyDef {
    id: string;
    name: string;
    /** 생김새. 화면 쪽(ui/monsters.ts)에서 픽셀 몬스터로 그린다 */
    look: {
        kind: 'ooze' | 'ghoul' | 'gargoyle' | 'rat' | 'skeleton' | 'flameskull' | 'cultist' | 'wraith' | 'eye' | 'knight' | 'sprite';
        variant?: string;
        scale?: number;
        crown?: boolean;
        /** kind가 'sprite'일 때: public/sprites의 캐릭터 이름 */
        sprite?: string;
        /** CSS filter로 색 변주 (예: 'hue-rotate(200deg)') */
        filter?: string;
        /** 원거리 공격이면 던질 투사체 이름 (달려가지 않음) */
        ranged?: string;
    };
    hp: [number, number];
    moves: Intent[];
    /** true면 무작위 행동, 아니면 순서대로 반복 */
    random?: boolean;
    size?: 'normal' | 'large' | 'huge';
    /** 체력이 절반 아래로 떨어지면 한 번 분노해 힘을 얻는다 (보스) */
    enrage?: number;
}

export interface Fighter {
    hp: number;
    maxHp: number;
    block: number;
    status: StatusMap;
}

export interface EnemyState extends Fighter {
    uid: string;
    defId: string;
    moveIdx: number;
    intent: Intent;
    dead?: boolean;
    affix?: Affix;
    enraged?: boolean;
}

export interface Fx {
    id: number;
    target: string; // 'player' | enemy uid
    text: string;
    kind: 'dmg' | 'block' | 'heal' | 'status';
    /** 연출 지연(초). 적의 턴 행동을 순서대로 보여주기 위해 사용 */
    delay: number;
    /** 치명타 피해 */
    crit?: boolean;
    /** 독처럼 공격이 아닌 피해 */
    dot?: boolean;
    /** 숫자만 (피해량) */
    amount?: number;
}

export type CueKind = 'card' | 'enemyAttack' | 'enemyBlock' | 'enemyBuff' | 'enemyDebuff' | 'enemyHeal' | 'death' | 'poison';

/** 화면 연출(픽셀 이펙트)을 위한 신호. 게임 규칙에는 영향 없음 */
export interface Cue {
    id: number;
    kind: CueKind;
    delay: number;
    card?: string;
    /** 'player' 또는 적 uid */
    target?: string | null;
    source?: string;
    /** 행동한 적의 종류 (연출용) */
    defId?: string;
    amount?: number;
    hits?: number;
}

export type CombatKind = 'normal' | 'elite' | 'boss';

export interface CombatState {
    kind: CombatKind;
    player: Fighter;
    enemies: EnemyState[];
    draw: CardInst[];
    hand: CardInst[];
    discard: CardInst[];
    exhaust: CardInst[];
    energy: number;
    maxEnergy: number;
    turn: number;
    fx: Fx[];
    fxSeq: number;
    cues: Cue[];
    cueSeq: number;
    /** 주인공 공격의 치명타 확률 (0~1) */
    critChance: number;
    /** 저주 카드 uid 번호 */
    curseSeq: number;
    /** 불사조 깃털: 남은 부활 횟수, 이번 전투에서 썼는지 */
    reviveLeft?: number;
    revived?: boolean;
    /** 이번 턴에 낸 카드 수 / 그중 공격 수 / 마지막으로 낸 카드 종류 (연계용) */
    played?: number;
    attacksPlayed?: number;
    lastType?: 'attack' | 'skill' | 'power' | null;
    /** 지금 발생하는 fx/cue에 붙일 지연 시간 */
    delay: number;
    result?: 'win' | 'lose';
}

export type RoomType = 'start' | 'combat' | 'elite' | 'treasure' | 'rest' | 'shop' | 'event' | 'boss';

export interface Room {
    id: number;
    x: number;
    y: number;
    type: RoomType;
    links: number[];
    seen: boolean;
    visited: boolean;
    cleared: boolean;
    encounter?: string[];
    eventId?: string;
    shop?: ShopScreen;
}

export interface FloorMap {
    w: number;
    h: number;
    cells: (Room | null)[];
    start: number;
}

export type Screen =
    | { kind: 'map' }
    | { kind: 'combat'; combat: CombatState }
    | {
          kind: 'reward';
          combatKind: CombatKind;
          gold: number;
          goldTaken: boolean;
          cards: string[];
          cardsDone: boolean;
          relic: string | null;
          relicTaken: boolean;
          /** 보스: 셋 중 하나를 고르는 유물 */
          relicChoices?: string[];
      }
    | { kind: 'rest'; done: boolean; message?: string }
    | ShopScreen
    | { kind: 'treasure'; relic: string | null; gold: number; taken: boolean }
    | { kind: 'event'; eventId: string; result?: string; /** 길에서 만난 랜덤 인카운터: 끝나면 원래 가던 방으로 들어간다 */ encounter?: boolean }
    | { kind: 'pick'; purpose: 'upgrade' | 'remove'; returnTo: Screen; cost?: number }
    | { kind: 'floorClear' }
    /** 이야기 장면 (story.ts의 scene 키). 끝나면 next 화면으로 */
    | { kind: 'dialogue'; scene: string; next: Screen }
    | { kind: 'gameover' }
    | { kind: 'victory' };

export interface RunState {
    /** 직업 */
    cls: ClassId;
    /** 주인공 모습 (ui/Actors.tsx HEROES의 id) */
    hero: string;
    /** 이번 탐험에서 지나는 지역 순서 (biomes.ts) */
    route: string[];
    /** 탐험 번호 (보여주기용) */
    expedition: number;
    floor: number;
    hp: number;
    maxHp: number;
    gold: number;
    deck: CardInst[];
    relics: string[];
    map: FloorMap;
    pos: number;
    facing: Dir;
    screen: Screen;
    uidSeq: number;
    stats: { kills: number; rooms: number; turns: number };
    /** 이야기 진행 (다시 만나는 인물과의 관계 등) */
    story?: { flags: Record<string, number> };
    /** 랜덤 인카운터 뒤에 원래 가던 방으로 들어가야 하는지 */
    pendingEnter?: boolean;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface ShopScreen {
    kind: 'shop';
    cards: { id: string; price: number; sold: boolean }[];
    removePrice: number;
    removed: boolean;
    /** 유물 한 점 */
    relic?: { id: string; price: number; sold: boolean };
}
