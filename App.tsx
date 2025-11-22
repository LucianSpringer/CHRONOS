

import React, { useState, useEffect, useRef } from 'react';
import { ChronosCausalityField, InventoryItem as IInventoryItem, ImageResolution, Settings, PlayerStats, CombatLogEntry, StatusEffect, Rarity, ItemType } from './types';
import { SynthesizeNarrativeVector, generateSceneImage } from './services/geminiService';
import { PersistenceAdaptor } from './services/PersistenceAdaptor';
import { CombatCausalityEngine } from './engines/CombatCausalityEngine';
import { CombatSimulationDeck } from './engineering/CombatSimulationDeck';
import { StateValidator } from './core/SchemaValidators';
import { ProceduralGenerationEngine } from './engines/ProceduralGenerationEngine';
import { TelemetryStream } from './ops/TelemetryStream';
import { InventoryItem } from './components/InventoryItem';
import { CharacterItem } from './components/CharacterItem';
import { SettingsModal } from './components/SettingsModal';
import { LoreChat } from './components/LoreChat';
import { CombatView } from './components/CombatView';
import { SpellOverlay } from './components/SpellOverlay';

interface AIStudioWrapper {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const INITIAL_STATS: PlayerStats = {
  str: 10,
  dex: 10,
  int: 12,
  mana: 30,
  maxMana: 30
};

const INITIAL_STATE: ChronosCausalityField = {
  currentNarrative: "You stand at the threshold of the Unknown. The air hums with potential. To your left, a dark forest whispers ancient secrets. To your right, a ruined citadel silhouette against the blood-moon. What is your path?",
  history: [],
  artifactRetentionMatrix: [],
  knownCharacters: [],
  currentQuest: "Discover your destiny.",
  sceneImageUrl: null,
  playerVisualDescription: null,
  possibleActions: ["Enter the dark forest", "Approach the ruined citadel", "Check your pockets"],
  isLoading: false,
  imageLoading: false,
  turnCount: 0,
  playerHp: 20,
  playerMaxHp: 20,
  playerStats: INITIAL_STATS,
  knownSpells: ["Spark"],
  spellCooldowns: {},
  playerActiveEffects: [],
  spellHistory: [],
  inCombat: false,
  combatEnemy: null,
  combatLog: [],
  combatTutorialSeen: false,
  isTutorialActive: false,
  lastSpellCast: null,
  screenShake: false,
};

export default function App() {
  const [ChronosCausalityField, setChronosCausalityField] = useState<ChronosCausalityField>(() => {
    const saved = PersistenceAdaptor.load('chronosState');
    return saved || INITIAL_STATE;
  });

  const [input, setInput] = useState('');
  const [settings, setSettings] = useState<Settings>({
    imageResolution: ImageResolution.RES_1K,
    artStyle: 'Dark Fantasy Oil Painting'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);

  // Inventory Filter State
  const [invFilter, setInvFilter] = useState<'all' | ItemType>('all');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    PersistenceAdaptor.save('chronosState', ChronosCausalityField);
  }, [ChronosCausalityField]);

  // Run diagnostic simulation on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎲 [CHRONOS] Running Combat Engine Diagnostics...');
      const diagnosticResults = CombatSimulationDeck.runDiagnostic();
      console.log(diagnosticResults);

      // Validate initial state integrity
      const isValid = StateValidator.validateIntegrity(ChronosCausalityField);
      console.log('✓ [VALIDATION] State Integrity:', isValid ? 'PASS' : 'FAIL');

      // Initialize Telemetry Stream
      TelemetryStream.init();
      console.log('📡 [TELEMETRY] Stream initialized - batch size: 50');

      // Generate procedural world
      const worldGen = new ProceduralGenerationEngine(50, 50);
      const biosphere = worldGen.generateBiosphere(Date.now());
      console.log('🌍 [WORLDGEN] Procedural biosphere generated:', biosphere.length, 'x', biosphere[0]?.length);

      // Log telemetry event
      TelemetryStream.logEvent('INFO', {
        module: 'App',
        event: 'initialization',
        worldSize: biosphere.length * (biosphere[0]?.length || 0)
      });
    }

    // Cleanup on unmount
    return () => {
      if (process.env.NODE_ENV === 'development') {
        TelemetryStream.terminate();
      }
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ChronosCausalityField.currentNarrative, ChronosCausalityField.combatLog]);

  // Handle Screen Shake reset
  useEffect(() => {
    if (ChronosCausalityField.screenShake) {
      const timer = setTimeout(() => {
        setChronosCausalityField(prev => ({ ...prev, screenShake: false }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ChronosCausalityField.screenShake]);

  const getAIStudio = (): AIStudioWrapper | undefined => {
    return (window as any).aistudio;
  };

  const checkApiKey = async () => {
    const ai = getAIStudio();
    if (ai && await ai.hasSelectedApiKey()) {
      setHasKey(true);
    } else {
      setHasKey(false);
    }
  };

  const handleAuth = async () => {
    const ai = getAIStudio();
    if (ai) {
      await ai.openSelectKey();
      await checkApiKey();
    }
  };

  const handleResetGame = () => {
    setChronosCausalityField(INITIAL_STATE);
    localStorage.removeItem('chronosState');
    setIsSettingsOpen(false);
  };

  const completeTutorial = () => {
    setChronosCausalityField(prev => ({ ...prev, isTutorialActive: false, combatTutorialSeen: true }));
  };

  const handleUseItem = (item: IInventoryItem) => {
    if (!item.effects) return;
    if (item.maxDurability && item.currentDurability === 0) return; // Cannot use broken items

    let newHp = ChronosCausalityField.playerHp;
    let newStats = { ...ChronosCausalityField.playerStats };
    let newEffects = [...ChronosCausalityField.playerActiveEffects];
    let newSpells = [...ChronosCausalityField.knownSpells];
    let logText = `Used ${item.name}:`;

    item.effects.forEach(eff => {
      if (eff.type === 'heal_hp' && eff.value) {
        newHp = Math.min(newHp + eff.value, ChronosCausalityField.playerMaxHp);
        logText += ` Healed ${eff.value} HP.`;
      }
      if (eff.type === 'heal_mana' && eff.value) {
        newStats.mana = Math.min(newStats.mana + eff.value, newStats.maxMana);
        logText += ` Restored ${eff.value} Mana.`;
      }
      if (eff.type === 'buff' && eff.statusEffect) {
        newEffects.push({ ...eff.statusEffect, id: crypto.randomUUID() });
        logText += ` Applied ${eff.statusEffect.name}.`;
      }
      if (eff.type === 'learn_spell' && eff.spellName) {
        if (!newSpells.includes(eff.spellName)) {
          newSpells.push(eff.spellName);
          logText += ` Learned spell: ${eff.spellName}!`;
        } else {
          logText += ` You already know ${eff.spellName}.`;
        }
      }
    });

    let newInventory = ChronosCausalityField.artifactRetentionMatrix;
    if (item.consumable) {
      newInventory = newInventory.filter(i => i.id !== item.id);
    }

    const newLog: CombatLogEntry[] = [
      ...ChronosCausalityField.combatLog,
      { text: logText, type: 'item', source: 'player' }
    ];

    setChronosCausalityField(prev => ({
      ...prev,
      playerHp: newHp,
      playerStats: newStats,
      playerActiveEffects: newEffects,
      inventory: newInventory,
      combatLog: newLog,
      knownSpells: newSpells
    }));
  };

  const processTurn = async (action: string) => {
    if (!hasKey) {
      await handleAuth();
      if (!hasKey) return;
    }

    setChronosCausalityField(prev => ({ ...prev, isLoading: true, imageLoading: true }));
    setShowSpellModal(false);

    // Detect Spell Cast client side for immediate feedback
    const isSpell = action.toLowerCase().startsWith("cast ");
    const spellCastName = isSpell ? action.substring(5).trim() : null;
    let newSpellHistory = [...ChronosCausalityField.spellHistory];

    if (spellCastName) {
      setChronosCausalityField(prev => ({ ...prev, lastSpellCast: spellCastName }));
      newSpellHistory.push(spellCastName);
      if (newSpellHistory.length > 5) newSpellHistory.shift();
    }

    try {
      // Cooldown Management: Decrement all by 1
      const updatedCooldowns = { ...ChronosCausalityField.spellCooldowns };
      Object.keys(updatedCooldowns).forEach(spell => {
        if (updatedCooldowns[spell] > 0) updatedCooldowns[spell] -= 1;
        if (updatedCooldowns[spell] <= 0) delete updatedCooldowns[spell];
      });

      const inventoryContext = ChronosCausalityField.artifactRetentionMatrix.map(i => ({ name: i.name, durability: i.currentDurability }));
      const knownCharsSimple = ChronosCausalityField.knownCharacters.map(c => ({ name: c.name, role: c.role }));

      const newHistory = [
        ...ChronosCausalityField.history,
        { role: 'user' as const, parts: [{ text: action }] }
      ];

      const storyData = await SynthesizeNarrativeVector(
        ChronosCausalityField.history,
        action,
        inventoryContext,
        knownCharsSimple,
        ChronosCausalityField.currentQuest,
        ChronosCausalityField.playerVisualDescription,
        ChronosCausalityField.playerHp,
        ChronosCausalityField.playerMaxHp,
        ChronosCausalityField.playerStats,
        ChronosCausalityField.knownSpells,
        updatedCooldowns,
        ChronosCausalityField.inCombat,
        ChronosCausalityField.combatEnemy ? {
          ...ChronosCausalityField.combatEnemy,
          hp: ChronosCausalityField.combatEnemy.hp || 10,
          activeEffects: ChronosCausalityField.combatEnemy.activeEffects,
          resistances: ChronosCausalityField.combatEnemy.resistances?.map(r => r as string),
          weaknesses: ChronosCausalityField.combatEnemy.weaknesses?.map(r => r as string)
        } : null,
        ChronosCausalityField.playerActiveEffects,
        newSpellHistory
      );

      // --- STATE UPDATES ---

      // Spell Cooldown Updates from AI
      if (storyData.spellCooldownUpdates) {
        storyData.spellCooldownUpdates.forEach(update => {
          updatedCooldowns[update.spellName] = update.cooldown;
        });
      }

      // Inventory & Loot
      let newInventory = [...ChronosCausalityField.artifactRetentionMatrix];

      // Add
      const itemsToAdd = [...(storyData.inventoryUpdates.add || []), ...(storyData.lootDropped || [])];
      itemsToAdd.forEach(itemStub => {
        newInventory.push({
          id: crypto.randomUUID(),
          name: itemStub.name,
          description: itemStub.description,
          effects: itemStub.effects,
          consumable: itemStub.consumable,
          icon: itemStub.icon,
          maxDurability: itemStub.maxDurability,
          currentDurability: itemStub.currentDurability ?? itemStub.maxDurability,
          rarity: itemStub.rarity,
          itemType: itemStub.itemType
        });
      });

      // Update Durability
      if (storyData.inventoryUpdates.update) {
        storyData.inventoryUpdates.update.forEach(update => {
          const itemIndex = newInventory.findIndex(i => i.name === update.name);
          if (itemIndex !== -1) {
            const updatedItem = { ...newInventory[itemIndex], currentDurability: update.newDurability };
            newInventory[itemIndex] = updatedItem;
          }
        });
      }

      // Remove
      if (storyData.inventoryUpdates.remove) {
        newInventory = newInventory.filter(i => !storyData.inventoryUpdates.remove?.includes(i.name));
      }

      // Characters
      let newCharacters = [...ChronosCausalityField.knownCharacters];
      if (storyData.characterUpdates?.add) {
        storyData.characterUpdates.add.forEach(char => {
          if (!newCharacters.find(c => c.name === char.name)) {
            newCharacters.push({ id: crypto.randomUUID(), ...char });
          } else {
            newCharacters = newCharacters.map(c => c.name === char.name ? { ...c, ...char } : c);
          }
        });
      }
      if (storyData.characterUpdates?.remove) {
        newCharacters = newCharacters.filter(c => !storyData.characterUpdates?.remove?.includes(c.name));
      }

      // Spells
      let newSpells = [...ChronosCausalityField.knownSpells];
      if (storyData.newSpells) {
        storyData.newSpells.forEach(s => {
          if (!newSpells.includes(s)) newSpells.push(s);
        });
      }

      // RPG Stats
      let currentPlayerHp = ChronosCausalityField.playerHp;
      let currentStats = { ...ChronosCausalityField.playerStats };

      if (storyData.statUpdates) {
        if (storyData.statUpdates.hpChange) currentPlayerHp += storyData.statUpdates.hpChange;
        if (storyData.statUpdates.manaChange) currentStats.mana += storyData.statUpdates.manaChange;
      }

      // Clamp values
      currentPlayerHp = Math.min(Math.max(currentPlayerHp, 0), ChronosCausalityField.playerMaxHp);
      currentStats.mana = Math.min(Math.max(currentStats.mana, 0), currentStats.maxMana);

      // Combat Logic
      let currentInCombat = ChronosCausalityField.inCombat;
      let currentEnemy = ChronosCausalityField.combatEnemy;
      let newCombatLog: CombatLogEntry[] = ChronosCausalityField.inCombat ? [...ChronosCausalityField.combatLog] : [];
      if (!currentInCombat && storyData.combatRound?.logs) {
        newCombatLog = storyData.combatRound.logs;
      }

      let playerEffects = [...ChronosCausalityField.playerActiveEffects];
      let shakeScreen = false;
      let triggerTutorial = false;

      // Start Combat
      if (storyData.combatEncounter) {
        currentInCombat = true;
        currentEnemy = {
          id: crypto.randomUUID(),
          name: storyData.combatEncounter.enemyName,
          role: 'Enemy',
          description: storyData.combatEncounter.enemyDescription,
          hp: storyData.combatEncounter.enemyHp,
          maxHp: storyData.combatEncounter.enemyHp,
          activeEffects: [],
          resistances: storyData.combatEncounter.resistances,
          weaknesses: storyData.combatEncounter.weaknesses
        };
        newCombatLog.push({ text: `Encounter started: ${storyData.combatEncounter.enemyName}`, type: 'info', source: 'system' });
        if (!ChronosCausalityField.combatTutorialSeen) {
          triggerTutorial = true;
        }
      }

      // Combat Updates from Round
      if (storyData.combatRound) {
        if (storyData.combatRound.logs) {
          if (currentInCombat) {
            newCombatLog = [...newCombatLog, ...storyData.combatRound.logs];
          } else {
            newCombatLog = storyData.combatRound.logs;
          }

          storyData.combatRound.logs.forEach(log => {
            if (log.type === 'damage' && log.source === 'player' && log.value && currentEnemy) {
              currentEnemy.hp = (currentEnemy.hp || 0) - log.value;
              shakeScreen = true;
            }
            if (log.type === 'damage' && log.source === 'enemy') {
              shakeScreen = true;
            }
            if (log.type === 'damage' && log.source === 'system') {
              shakeScreen = true;
            }
          });
        }

        // Status Effects Updates
        if (storyData.combatRound.statusUpdates) {
          // Player
          if (storyData.combatRound.statusUpdates.player?.add) {
            const newEffects = storyData.combatRound.statusUpdates.player.add;
            newEffects.forEach(eff => {
              if (!playerEffects.find(e => e.name === eff.name)) playerEffects.push(eff);
            });
          }
          if (storyData.combatRound.statusUpdates.player?.remove) {
            const toRemove = storyData.combatRound.statusUpdates.player.remove;
            playerEffects = playerEffects.filter(e => !toRemove.includes(e.name));
            playerEffects = playerEffects.map(e => ({ ...e, duration: Math.max(0, e.duration - 1) })).filter(e => e.duration > 0);
          }

          // Enemy
          if (currentEnemy && storyData.combatRound.statusUpdates.enemy) {
            let enemyEffects = currentEnemy.activeEffects || [];
            if (storyData.combatRound.statusUpdates.enemy.add) {
              storyData.combatRound.statusUpdates.enemy.add.forEach(eff => {
                if (!enemyEffects.find(e => e.name === eff.name)) enemyEffects.push(eff);
              });
            }
            if (storyData.combatRound.statusUpdates.enemy.remove) {
              const toRemove = storyData.combatRound.statusUpdates.enemy.remove;
              enemyEffects = enemyEffects.filter(e => !toRemove.includes(e.name));
              enemyEffects = enemyEffects.map(e => ({ ...e, duration: Math.max(0, e.duration - 1) })).filter(e => e.duration > 0);
            }
            currentEnemy.activeEffects = enemyEffects;
          }
        }

        if (storyData.combatRound.isCombatOver) {
          currentInCombat = false;
          currentEnemy = null;
          newCombatLog.push({ text: "Combat finished.", type: 'info', source: 'system' });
        }
      }

      // Death Check
      if (currentPlayerHp <= 0) {
        currentInCombat = false;
        newCombatLog.push({ text: "You have fallen...", type: 'info', source: 'system' });
        shakeScreen = true;
      }

      setChronosCausalityField(prev => ({
        ...prev,
        currentNarrative: storyData.narrative,
        history: [
          ...newHistory,
          { role: 'model', parts: [{ text: JSON.stringify(storyData) }] }
        ],
        inventory: newInventory,
        knownCharacters: newCharacters,
        knownSpells: newSpells,
        currentQuest: storyData.questUpdate || prev.currentQuest,
        playerVisualDescription: storyData.playerAppearanceUpdate || prev.playerVisualDescription,
        possibleActions: storyData.suggestedActions,
        isLoading: false,
        playerHp: currentPlayerHp,
        playerStats: currentStats,
        inCombat: currentInCombat,
        combatEnemy: currentEnemy,
        combatLog: newCombatLog,
        turnCount: prev.turnCount + 1,
        playerActiveEffects: playerEffects,
        screenShake: shakeScreen,
        isTutorialActive: triggerTutorial || prev.isTutorialActive,
        spellHistory: newSpellHistory,
        spellCooldowns: updatedCooldowns
      }));

      // Image Generation
      const currentPlayerDesc = storyData.playerAppearanceUpdate || ChronosCausalityField.playerVisualDescription;
      const imageUrl = await generateSceneImage(
        storyData.visualDescription,
        settings.imageResolution,
        settings.artStyle,
        currentPlayerDesc
      );

      setChronosCausalityField(prev => ({
        ...prev,
        sceneImageUrl: imageUrl,
        imageLoading: false
      }));

    } catch (error) {
      console.error(error);
      setChronosCausalityField(prev => ({
        ...prev,
        isLoading: false,
        imageLoading: false,
        currentNarrative: "The threads of fate are tangled. (API Error)."
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || ChronosCausalityField.isLoading) return;
    processTurn(input);
    setInput('');
  };

  const filteredInventory = ChronosCausalityField.artifactRetentionMatrix
    .filter(item => invFilter === 'all' || item.itemType === invFilter)
    .sort((a, b) => {
      // Simple sort by Rarity value for now (Legendary > Common)
      const rarityVal = (r?: Rarity) => {
        if (r === 'legendary') return 5;
        if (r === 'epic') return 4;
        if (r === 'rare') return 3;
        if (r === 'uncommon') return 2;
        return 1;
      };
      return rarityVal(b.rarity) - rarityVal(a.rarity);
    });

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        <div className="relative z-10 glass-panel p-8 rounded-2xl max-w-lg text-center shadow-2xl border-t border-slate-700">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300 mb-4 fantasy-font">CHRONOS</h1>
          <p className="text-slate-300 mb-8 text-lg">Infinite Worlds. Infinite Choices. Real-time Generation.</p>
          <button
            onClick={handleAuth}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 transform hover:scale-[1.02]"
          >
            Connect to the Multiverse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col md:flex-row overflow-hidden font-sans ${ChronosCausalityField.screenShake ? 'animate-shake' : ''}`}>
      <SpellOverlay
        spellName={ChronosCausalityField.lastSpellCast}
        onComplete={() => setChronosCausalityField(prev => ({ ...prev, lastSpellCast: null }))}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onRequestApiKey={handleAuth}
      />

      {isSettingsOpen && (
        <div className="fixed z-[60] bottom-10 left-1/2 -translate-x-1/2">
          <button onClick={handleResetGame} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500 shadow-lg">
            Reset Save Data
          </button>
        </div>
      )}

      <LoreChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        history={ChronosCausalityField.history}
        currentContext={`Quest: ${ChronosCausalityField.currentQuest}. Narrative: ${ChronosCausalityField.currentNarrative}. HP: ${ChronosCausalityField.playerHp}`}
      />

      {/* --- SIDEBAR --- */}
      <aside className="w-full md:w-80 lg:w-96 bg-slate-900/50 border-r border-slate-800 flex flex-col h-[30vh] md:h-screen shrink-0 backdrop-blur-sm z-20">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <h1 className="text-2xl font-bold text-indigo-400 fantasy-font tracking-wider">CHRONOS</h1>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors hover:rotate-90 duration-500">
            <span className="material-symbols-outlined text-slate-400">settings</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Player Status */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">vital_signs</span>
              Status
            </h2>
            <div className="glass-panel p-4 rounded-lg border border-slate-700 space-y-3">
              {/* HP */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Health</span>
                  <span className={ChronosCausalityField.playerHp < 10 ? 'text-red-500' : 'text-emerald-400'}>
                    {ChronosCausalityField.playerHp} / {ChronosCausalityField.playerMaxHp}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(ChronosCausalityField.playerHp / ChronosCausalityField.playerMaxHp) * 100}%` }}></div>
                </div>
              </div>
              {/* Mana */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Mana</span>
                  <span className="text-blue-400">
                    {ChronosCausalityField.playerStats.mana} / {ChronosCausalityField.playerStats.maxMana}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(ChronosCausalityField.playerStats.mana / ChronosCausalityField.playerStats.maxMana) * 100}%` }}></div>
                </div>
              </div>

              {/* Status Effects List */}
              {ChronosCausalityField.playerActiveEffects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-700/50">
                  {ChronosCausalityField.playerActiveEffects.map((eff, i) => (
                    <div key={i} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border ${eff.type === 'buff' ? 'bg-blue-900/30 border-blue-500/30 text-blue-200' : 'bg-red-900/30 border-red-500/30 text-red-200'
                      }`}>
                      <span className="material-symbols-outlined text-[10px]">{eff.icon || 'circle'}</span>
                      {eff.name} ({eff.duration})
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50 text-center">
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-[10px] text-slate-500 uppercase">STR</div>
                  <div className="font-bold text-slate-200">{ChronosCausalityField.playerStats.str}</div>
                </div>
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-[10px] text-slate-500 uppercase">DEX</div>
                  <div className="font-bold text-slate-200">{ChronosCausalityField.playerStats.dex}</div>
                </div>
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-[10px] text-slate-500 uppercase">INT</div>
                  <div className="font-bold text-slate-200">{ChronosCausalityField.playerStats.int}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Spells */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_fix</span>
              Grimoire
            </h2>
            <div className="flex flex-wrap gap-2">
              {ChronosCausalityField.knownSpells.map(spell => (
                <span key={spell} className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-200 hover:bg-purple-800/50 cursor-default transition-colors">
                  {spell}
                </span>
              ))}
              {ChronosCausalityField.knownSpells.length === 0 && <span className="text-xs text-slate-600 italic">No spells learned.</span>}
            </div>
          </section>

          {/* Quest Section */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">flag</span>
              Current Quest
            </h2>
            <div className="glass-panel p-4 rounded-lg border-l-4 border-yellow-500 shadow-lg shadow-black/20 hover:scale-[1.01] transition-transform">
              <p className="text-sm font-medium text-yellow-100 leading-relaxed">{ChronosCausalityField.currentQuest}</p>
            </div>
          </section>

          {/* Inventory Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">backpack</span>
                <span>Inventory</span>
                <span className="text-slate-600 bg-slate-800 px-2 py-0.5 rounded text-[10px]">{ChronosCausalityField.artifactRetentionMatrix.length}</span>
              </h2>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {(['all', 'weapon', 'armor', 'consumable', 'tome'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setInvFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] uppercase whitespace-nowrap transition-colors border ${invFilter === f
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredInventory.length === 0 && <div className="text-xs text-slate-600 text-center py-4 italic">Empty...</div>}
              {filteredInventory.map((item) => (
                <InventoryItem key={item.id} item={item} onUse={handleUseItem} />
              ))}
            </div>
          </section>

          {/* Characters Section */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">groups</span>
                <span>Known Figures</span>
              </div>
              <span className="text-slate-600 bg-slate-800 px-2 py-0.5 rounded text-[10px]">{ChronosCausalityField.knownCharacters.length}</span>
            </h2>
            <div className="space-y-2">
              {ChronosCausalityField.knownCharacters.map((char) => (
                <CharacterItem key={char.id} character={char} />
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-[70vh] md:h-screen relative">

        {/* Visual Layer */}
        <div className="h-[40%] md:h-[55%] w-full bg-black relative overflow-hidden group">
          {ChronosCausalityField.sceneImageUrl ? (
            <img
              src={ChronosCausalityField.sceneImageUrl}
              alt="Scene"
              className={`w-full h-full object-cover transition-all duration-1000 ${ChronosCausalityField.imageLoading ? 'scale-105 opacity-80 blur-sm' : 'scale-100 opacity-100'} ${ChronosCausalityField.inCombat ? 'saturate-150 contrast-125' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
              <span className="material-symbols-outlined text-6xl text-slate-800 mb-4">image</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent opacity-80 pointer-events-none"></div>
          {ChronosCausalityField.inCombat && <div className="absolute inset-0 bg-red-900/10 mix-blend-overlay animate-pulse pointer-events-none"></div>}
        </div>

        {/* Narrative Layer */}
        <div className="flex-1 flex flex-col -mt-20 z-10">

          {/* Story Text Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 pb-6 space-y-8 custom-scrollbar relative mask-linear-top">
            <div className="max-w-4xl mx-auto pt-10">
              {/* History */}
              {ChronosCausalityField.history.length > 0 && ChronosCausalityField.history.slice(-2).map((h, i) => (
                h.role === 'user' && (
                  <div key={i} className="flex justify-end mb-8 opacity-60">
                    <span className="bg-indigo-900/30 text-indigo-200 px-6 py-3 rounded-2xl rounded-tr-sm border border-indigo-500/20 text-sm italic">
                      {h.parts[0].text}
                    </span>
                  </div>
                )
              ))}

              {/* Current Narrative */}
              <div className={`prose prose-invert prose-lg max-w-none transition-all duration-700 ${ChronosCausalityField.isLoading ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
                <p className="leading-relaxed text-slate-200 text-lg drop-shadow-sm font-light tracking-wide whitespace-pre-wrap">
                  {ChronosCausalityField.isLoading ? "The fates are weaving..." : ChronosCausalityField.currentNarrative}
                </p>
              </div>
            </div>
          </div>

          {/* Interaction Deck */}
          {ChronosCausalityField.inCombat ? (
            <CombatView
              enemy={ChronosCausalityField.combatEnemy}
              playerHp={ChronosCausalityField.playerHp}
              maxHp={ChronosCausalityField.playerMaxHp}
              playerStats={ChronosCausalityField.playerStats}
              combatLog={ChronosCausalityField.combatLog}
              onAction={processTurn}
              knownSpells={ChronosCausalityField.knownSpells}
              playerEffects={ChronosCausalityField.playerActiveEffects}
              isTutorialActive={ChronosCausalityField.isTutorialActive}
              onTutorialComplete={completeTutorial}
              spellCooldowns={ChronosCausalityField.spellCooldowns}
            />
          ) : (
            <div className="p-6 md:p-10 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-slate-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <div className="max-w-4xl mx-auto space-y-6">

                {/* Actions */}
                {!ChronosCausalityField.isLoading && (
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start animate-fadeIn">
                    {ChronosCausalityField.possibleActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => processTurn(action)}
                        className="px-5 py-2.5 bg-slate-800/50 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-400 rounded-xl text-sm font-medium text-indigo-300 transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95 shadow-lg shadow-black/20"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="relative group">
                  <div className="relative flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="What is your command?"
                      disabled={ChronosCausalityField.isLoading}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-6 pr-20 text-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner hover:border-slate-600"
                    />

                    {/* Cast Spell Button (Out of Combat) */}
                    {!ChronosCausalityField.inCombat && ChronosCausalityField.knownSpells.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSpellModal(!showSpellModal)}
                        className="absolute right-16 top-2 bottom-2 px-3 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Cast Spell"
                      >
                        <span className="material-symbols-outlined">auto_fix</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={!input.trim() || ChronosCausalityField.isLoading}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl text-white flex items-center justify-center transition-all shadow-lg hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    >
                      {ChronosCausalityField.isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span className="material-symbols-outlined">arrow_forward</span>
                      )}
                    </button>
                  </div>

                  {/* Spell Modal (Quick Cast) */}
                  {showSpellModal && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-slideUp">
                      <div className="p-2 text-xs font-bold text-slate-500 uppercase bg-slate-800">Cast Spell</div>
                      {ChronosCausalityField.knownSpells.map(spell => {
                        const cooldown = ChronosCausalityField.spellCooldowns[spell] || 0;
                        const onCooldown = cooldown > 0;
                        return (
                          <button
                            key={spell}
                            type="button"
                            disabled={onCooldown}
                            onClick={() => { processTurn(`Cast ${spell}`); setShowSpellModal(false); }}
                            className={`w-full text-left px-4 py-2 text-sm border-b border-slate-800 last:border-0 flex justify-between items-center ${onCooldown ? 'text-slate-500 cursor-not-allowed bg-slate-900/50' : 'text-purple-300 hover:bg-purple-900/30 hover:text-purple-100 transition-colors'
                              }`}
                          >
                            <span>{spell}</span>
                            {onCooldown && <span className="text-[10px] bg-slate-700 px-1 rounded text-white">{cooldown}t</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Chat Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute bottom-32 right-8 md:bottom-10 md:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-white transition-all hover:scale-110 z-40 border-2 border-indigo-400/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]"
        >
          <span className="material-symbols-outlined text-2xl">auto_awesome</span>
        </button>

      </main>
    </div>
  );
}
