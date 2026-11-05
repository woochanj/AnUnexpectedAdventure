export type Status = 'strength' | 'vulnerable' | 'weak' | 'poison' | 'thorns' | 'regen' | 'energize';
export type StatusMap = Partial<Record<Status, number>>;

export type Effect =
    | { kind: 'damage'; amount: number; hits?: number }
    | { kind: 'damageAll'; amount: number; hits?: number }
    | { kind: 'block'; amount: number }
    | { kind: 'draw'; amount: number }
    | { kind: 'energy'; amount: number }
    | { kind: 'heal'; amount: number }
    | { kind: 'apply'; status: Status; amount: number; to: 'target' | 'all' | 'self' }
    | { kind: 'doublePoison' };

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
}

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
}

export interface Fx {
    id: number;
    target: string; // 'player' | enemy uid
    text: string;
    kind: 'dmg' | 'block' | 'heal' | 'status';
    /** 연출 지연(초). 적의 턴 행동을 순서대로 보여주기 위해 사용 */
    delay: number;
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
      }
    | { kind: 'rest'; done: boolean; message?: string }
    | ShopScreen
    | { kind: 'treasure'; relic: string | null; gold: number; taken: boolean }
    | { kind: 'event'; eventId: string; result?: string }
    | { kind: 'pick'; purpose: 'upgrade' | 'remove'; returnTo: Screen; cost?: number }
    | { kind: 'floorClear' }
    | { kind: 'gameover' }
    | { kind: 'victory' };

export interface RunState {
    /** 직업 */
    cls: ClassId;
    /** 주인공 모습 (ui/Actors.tsx HEROES의 id) */
    hero: string;
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
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface ShopScreen {
    kind: 'shop';
    cards: { id: string; price: number; sold: boolean }[];
    removePrice: number;
    removed: boolean;
}
