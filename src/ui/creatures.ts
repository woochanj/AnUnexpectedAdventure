// pixelfx 모듈 등록표: 적의 look.fx 문자열과 방 화면 장식을 모듈로 바꾼다.
import type { FxModule } from 'pixelfx';
import * as slime from 'pixelfx/fx/critters/slime';
import * as frog from 'pixelfx/fx/critters/frog';
import * as bat from 'pixelfx/fx/critters/bat';
import * as snake from 'pixelfx/fx/critters/snake';
import * as ghost from 'pixelfx/fx/critters/ghost';
import * as wisp from 'pixelfx/fx/critters/wisp';
import * as eyeball from 'pixelfx/fx/critters/eyeball';
import * as jellyfish from 'pixelfx/fx/critters/jellyfish';
import * as flyingSkull from 'pixelfx/fx/critters/flying-skull';
import * as arcaneOrb from 'pixelfx/fx/arcane/arcane-orb';
import * as voidOrb from 'pixelfx/fx/shadow/void-orb';
import * as campfire from 'pixelfx/fx/fire/campfire';
import * as chestOpen from 'pixelfx/fx/pickups/chest-open';
import * as coinSpin from 'pixelfx/fx/pickups/coin-spin';
import * as gemSpin from 'pixelfx/fx/pickups/gem-spin';
import * as portal from 'pixelfx/fx/arcane/portal';
import * as torch from 'pixelfx/fx/fire/torch';
import * as runeCircle from 'pixelfx/fx/arcane/rune-circle';
import * as lootBeam from 'pixelfx/fx/pickups/loot-beam';
import * as soulRise from 'pixelfx/fx/spawn/soul-rise';
import * as levelUp from 'pixelfx/fx/ui/level-up';
import * as confetti from 'pixelfx/fx/ui/confetti';

export const FX: Record<string, FxModule> = {
    'critters/slime': slime,
    'critters/frog': frog,
    'critters/bat': bat,
    'critters/snake': snake,
    'critters/ghost': ghost,
    'critters/wisp': wisp,
    'critters/eyeball': eyeball,
    'critters/jellyfish': jellyfish,
    'critters/flying-skull': flyingSkull,
    'arcane/arcane-orb': arcaneOrb,
    'shadow/void-orb': voidOrb,
    'fire/campfire': campfire,
    'pickups/chest-open': chestOpen,
    'pickups/coin-spin': coinSpin,
    'pickups/gem-spin': gemSpin,
    'arcane/portal': portal,
    'fire/torch': torch,
    'arcane/rune-circle': runeCircle,
    'pickups/loot-beam': lootBeam,
    'spawn/soul-rise': soulRise,
    'ui/level-up': levelUp,
    'ui/confetti': confetti,
};

/** undefined 값은 빼고 넘긴다 (그대로 넘기면 pixelfx 기본값을 덮어써 버린다) */
export function cleanOpts(o: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
