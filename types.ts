

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K',
}

export type ElementType = 'fire' | 'ice' | 'lightning' | 'poison' | 'physical' | 'arcane' | 'earth' | 'wind' | 'holy' | 'dark';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'key' | 'tome';

export interface ItemEffect {
  type: 'heal_hp' | 'heal_mana' | 'buff' | 'cure_status' | 'damage' | 'learn_spell';
  value?: number;
  statusEffect?: StatusEffect;
  targetAttribute?: string; // e.g. 'poison' for cure
  element?: ElementType;
  spellName?: string; // For learn_spell
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  consumable?: boolean;
  effects?: ItemEffect[];
  icon?: string; // Material symbol
  maxDurability?: number;
  currentDurability?: number;
  rarity?: Rarity;
  itemType?: ItemType;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  description: string;
  duration: number; // turns remaining
  icon: string; // Material Symbol name
  element?: ElementType;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  hp?: number;
  maxHp?: number;
  activeEffects?: StatusEffect[];
  resistances?: ElementType[];
  weaknesses?: ElementType[];
}

export interface PlayerStats {
  str: number;
  dex: number;
  int: number;
  mana: number;
  maxMana: number;
}

export interface CombatLogEntry {
  text: string;
  type: 'damage' | 'heal' | 'miss' | 'spell' | 'info' | 'enemy_move' | 'effect' | 'ability' | 'item';
  value?: number;
  source: 'player' | 'enemy' | 'system';
  isCritical?: boolean;
  element?: ElementType;
}

export interface GameState {
  currentNarrative: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  inventory: InventoryItem[];
  knownCharacters: Character[];
  currentQuest: string;
  sceneImageUrl: string | null;
  playerVisualDescription: string | null;
  possibleActions: string[];
  isLoading: boolean;
  imageLoading: boolean;
  turnCount: number;
  
  // RPG Stats
  playerHp: number;
  playerMaxHp: number;
  playerStats: PlayerStats;
  knownSpells: string[];
  spellCooldowns: Record<string, number>; // Spell Name -> Turns remaining
  playerActiveEffects: StatusEffect[];
  spellHistory: string[]; // Track recent spells for combos
  
  // Combat State
  inCombat: boolean;
  combatEnemy: Character | null;
  combatLog: CombatLogEntry[];
  combatTutorialSeen: boolean;
  isTutorialActive: boolean;
  
  // Visual Triggers
  lastSpellCast: string | null; // Triggers animation
  screenShake: boolean; // Triggers damage shake
}

// Helper interface for the AI response which might return fuller item details now
export interface AIItemStub {
  name: string;
  description: string;
  consumable: boolean;
  effects: ItemEffect[];
  icon: string;
  maxDurability?: number;
  currentDurability?: number;
  rarity?: Rarity;
  itemType?: ItemType;
}

export interface StoryTurnResponse {
  narrative: string;
  visualDescription: string;
  inventoryUpdates: {
    add?: AIItemStub[]; 
    remove?: string[];
    update?: { name: string; newDurability: number }[]; // For durability changes
  };
  characterUpdates: {
    add?: { name: string; role: string; description: string; hp?: number; resistances?: ElementType[]; weaknesses?: ElementType[] }[];
    remove?: string[];
  };
  questUpdate?: string;
  suggestedActions: string[];
  playerAppearanceUpdate?: string;
  
  // RPG Mechanics
  statUpdates?: {
    hpChange?: number;
    manaChange?: number;
  };
  
  spellCooldownUpdates?: { spellName: string; cooldown: number }[]; // Sets cooldowns
  
  combatEncounter?: {
    enemyName: string;
    enemyDescription: string;
    enemyHp: number;
    enemyAbilities?: string[];
    resistances?: ElementType[];
    weaknesses?: ElementType[];
  };
  
  combatRound?: {
    isCombatOver: boolean;
    logs: CombatLogEntry[];
    statusUpdates?: {
        player?: {
            add?: StatusEffect[];
            remove?: string[]; // remove by name
        };
        enemy?: {
            add?: StatusEffect[];
            remove?: string[];
        };
    };
  };

  lootDropped?: AIItemStub[];
  newSpells?: string[];
}

export interface Settings {
  imageResolution: ImageResolution;
  artStyle: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}
