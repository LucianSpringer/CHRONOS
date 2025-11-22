

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ImageResolution, StoryTurnResponse, PlayerStats, StatusEffect } from "../types";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.warn("API Key not found. Ensure authentication flow is triggered.");
    return "";
  }
  return key;
};

// --- SCHEMA DEFINITIONS ---

const statusEffectSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['buff', 'debuff'] },
        description: { type: Type.STRING },
        duration: { type: Type.INTEGER },
        icon: { type: Type.STRING, description: "Material Symbol name." },
        element: { type: Type.STRING, enum: ['fire', 'ice', 'lightning', 'poison', 'physical', 'arcane', 'earth', 'wind', 'holy', 'dark'] }
    },
    required: ["id", "name", "type", "description", "duration", "icon"]
};

const itemEffectSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['heal_hp', 'heal_mana', 'buff', 'cure_status', 'damage', 'learn_spell'] },
        value: { type: Type.INTEGER },
        statusEffect: statusEffectSchema,
        targetAttribute: { type: Type.STRING },
        element: { type: Type.STRING, enum: ['fire', 'ice', 'lightning', 'poison', 'physical', 'arcane', 'earth', 'wind', 'holy', 'dark'] },
        spellName: { type: Type.STRING, description: "Only for learn_spell type" }
    },
    required: ["type"]
};

const inventoryItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        consumable: { type: Type.BOOLEAN },
        effects: { type: Type.ARRAY, items: itemEffectSchema },
        icon: { type: Type.STRING, description: "Material Symbol name matching the item" },
        maxDurability: { type: Type.INTEGER },
        currentDurability: { type: Type.INTEGER },
        rarity: { type: Type.STRING, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
        itemType: { type: Type.STRING, enum: ['weapon', 'armor', 'consumable', 'material', 'key', 'tome'] }
    },
    required: ["name", "description", "consumable", "icon", "effects"]
};

const storyTurnSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The main story text. Describe critical hits, elemental reactions, and broken gear vividly.",
    },
    visualDescription: {
      type: Type.STRING,
      description: "Visual description for image generation.",
    },
    inventoryUpdates: {
      type: Type.OBJECT,
      properties: {
        add: { type: Type.ARRAY, items: inventoryItemSchema },
        remove: { type: Type.ARRAY, items: { type: Type.STRING } },
        update: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                properties: { 
                    name: { type: Type.STRING }, 
                    newDurability: { type: Type.INTEGER }
                },
                required: ["name", "newDurability"]
            }
        }
      },
    },
    characterUpdates: {
      type: Type.OBJECT,
      properties: {
        add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              description: { type: Type.STRING },
              hp: { type: Type.INTEGER },
              resistances: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "role", "description"],
          },
        },
        remove: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    questUpdate: { type: Type.STRING },
    suggestedActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Choices for the player.",
    },
    playerAppearanceUpdate: { type: Type.STRING },
    
    // RPG Mechanics
    statUpdates: {
        type: Type.OBJECT,
        properties: {
            hpChange: { type: Type.INTEGER },
            manaChange: { type: Type.INTEGER }
        }
    },
    spellCooldownUpdates: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                spellName: { type: Type.STRING },
                cooldown: { type: Type.INTEGER, description: "Number of turns to wait." }
            },
            required: ["spellName", "cooldown"]
        }
    },
    combatEncounter: {
      type: Type.OBJECT,
      description: "Populate ONLY if a NEW combat encounter starts.",
      properties: {
        enemyName: { type: Type.STRING },
        enemyDescription: { type: Type.STRING },
        enemyHp: { type: Type.INTEGER },
        enemyAbilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        resistances: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["enemyName", "enemyHp"],
    },
    combatRound: {
      type: Type.OBJECT,
      description: "Populate if the player is in combat OR if environmental effects occur.",
      properties: {
        isCombatOver: { type: Type.BOOLEAN },
        logs: {
            type: Type.ARRAY,
            description: "Detailed chronological events.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['damage', 'heal', 'miss', 'spell', 'info', 'enemy_move', 'effect', 'ability', 'item'] },
                    value: { type: Type.INTEGER },
                    source: { type: Type.STRING, enum: ['player', 'enemy', 'system'] },
                    isCritical: { type: Type.BOOLEAN },
                    element: { type: Type.STRING }
                },
                required: ['text', 'type', 'source']
            }
        },
        statusUpdates: {
            type: Type.OBJECT,
            properties: {
                player: {
                    type: Type.OBJECT,
                    properties: {
                        add: { type: Type.ARRAY, items: statusEffectSchema },
                        remove: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                },
                enemy: {
                    type: Type.OBJECT,
                    properties: {
                        add: { type: Type.ARRAY, items: statusEffectSchema },
                        remove: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
      },
    },
    lootDropped: {
        type: Type.ARRAY,
        items: inventoryItemSchema,
        description: "List of items dropped."
    },
    newSpells: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Spells learned directly via events/NPCs. For items (Tomes), use inventory item effects."
    }
  },
  required: ["narrative", "visualDescription", "suggestedActions"],
};

// --- SERVICE METHODS ---

export const generateStoryTurn = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userAction: string,
  currentInventory: { name: string; durability?: number }[],
  knownCharacters: { name: string; role: string }[],
  currentQuest: string,
  playerVisuals: string | null,
  // New RPG Context
  playerHp: number,
  playerMaxHp: number,
  stats: PlayerStats,
  knownSpells: string[],
  spellCooldowns: Record<string, number>,
  inCombat: boolean,
  combatEnemy: { name: string; hp: number; activeEffects?: StatusEffect[]; resistances?: string[]; weaknesses?: string[] } | null,
  playerActiveEffects: StatusEffect[],
  spellHistory: string[]
): Promise<StoryTurnResponse> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const combatContext = inCombat && combatEnemy
    ? `⚠️ COMBAT MODE ACTIVE against ${combatEnemy.name} (HP: ${combatEnemy.hp}).
       - PLAYER STATS: STR:${stats.str}, DEX:${stats.dex}, INT:${stats.int}, MANA:${stats.mana}/${stats.maxMana}.
       - SPELL COOLDOWNS: ${JSON.stringify(spellCooldowns)} (Do NOT allow casting if > 0).
       - ENEMY RESISTANCES: ${JSON.stringify(combatEnemy.resistances || [])}.
       - ENEMY WEAKNESSES: ${JSON.stringify(combatEnemy.weaknesses || [])}.
       - CRITICAL HITS: Calc chance based on DEX. If (DEX * 2) > Random(0-100), trigger CRITICAL (2x Dmg). Mark 'isCritical': true.
       - ITEM DURABILITY: Decrease durability of used weapons/armor by 1-2 points. Use 'inventoryUpdates.update'. If 0, item breaks (cannot use).
       - SPELL COMBOS & ELEMENTS: Apply elemental multipliers (Fire > Ice = 2x, etc.).`
    : `Exploration Mode. 
       - DURABILITY: Using tools/weapons to pry/break things reduces durability.
       - COOLDOWNS: Spells cast here also trigger cooldowns (usually 1-3 turns).
       - CRAFTING/REPAIR: If user tries to repair and has kit/resources, restore durability via 'inventoryUpdates.update'.`;

  const systemInstruction = `
    You are the Game Master (Gemini 3 Pro).
    
    Current State:
    - Quest: ${currentQuest}
    - Inventory: ${JSON.stringify(currentInventory)}
    - Spells: ${JSON.stringify(knownSpells)}
    - HP: ${playerHp}/${playerMaxHp}
    - Stats: ${JSON.stringify(stats)}
    - Visuals: ${playerVisuals || "Undefined"}

    ${combatContext}

    General Rules:
    1. Narrative: High-quality, emergent storytelling. Describe critical strikes and elemental effects vividly.
    2. Mechanics: 
       - Enforce Spell Cooldowns: Return 'spellCooldownUpdates' (e.g., Fireball: 3 turns) when cast.
       - Manage Durability: Non-consumable items have durability.
       - Elemental Rock-Paper-Scissors: Fire melts Ice, Water conducts Lightning, Earth resists Lightning, etc.
    3. Environmental Interaction:
       - If user uses a spell/item on the environment (e.g. "Burn the vines"), resolve it.
       - Grant buffs/debuffs for environmental hazards (e.g., "Standing in Poison Swamp" -> Add Poison Debuff).
    4. Spell Discovery:
       - Spells should primarily be learned via Items (Tomes/Scrolls) or NPCs. 
       - If a user reads a tome, use the 'itemEffect' of type 'learn_spell'.
       - Generate 'Tome of [Spell]' as loot with 'itemType': 'tome' and effect 'learn_spell'.
    5. JSON Only: Output must strictly follow the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userAction }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storyTurnSchema,
        thinkingConfig: { thinkingBudget: 4096 },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as StoryTurnResponse;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Story Generation Error:", error);
    throw error;
  }
};

export const generateSceneImage = async (
  visualDescription: string,
  resolution: ImageResolution,
  artStyle: string,
  playerDescription: string | null
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const subjectStr = playerDescription ? `Subject: ${playerDescription}. ` : "";
  const fullPrompt = `${subjectStr}${visualDescription}. Art Style: ${artStyle}. Cinematic, detailed, atmospheric.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: resolution,
        }
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};

export const quickItemExamine = async (itemName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Describe "${itemName}" in a fantasy RPG context in one sentence.`,
    });
    return response.text || "Mystery object.";
  } catch (error) { return "Unclear."; }
};

export const chatWithLoreKeeper = async (
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    userQuestion: string,
    currentContext: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                ...history,
                { role: 'user', parts: [{ text: `Question: ${userQuestion}` }] }
            ],
            config: {
                systemInstruction: `You are the Lore Keeper. Context: ${currentContext}. Answer efficiently based on history.`,
            }
        });
        return response.text || "...";
    } catch (error) { return "Silence."; }
}
