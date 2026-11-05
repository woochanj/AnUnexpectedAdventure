// pixelfx 모듈 등록표: 방 화면 장식(모닥불, 상자 등)에 쓰는 이펙트.
import type { FxModule } from 'pixelfx';
import * as campfire from 'pixelfx/fx/fire/campfire';
import * as chestOpen from 'pixelfx/fx/pickups/chest-open';
import * as coinSpin from 'pixelfx/fx/pickups/coin-spin';
import * as portal from 'pixelfx/fx/arcane/portal';
import * as lootBeam from 'pixelfx/fx/pickups/loot-beam';

export const FX: Record<string, FxModule> = {
    'fire/campfire': campfire,
    'pickups/chest-open': chestOpen,
    'pickups/coin-spin': coinSpin,
    'arcane/portal': portal,
    'pickups/loot-beam': lootBeam,
};

/** undefined 값은 빼고 넘긴다 (그대로 넘기면 pixelfx 기본값을 덮어써 버린다) */
export function cleanOpts(o: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
