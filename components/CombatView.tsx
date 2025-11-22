

import React, { useEffect, useRef, useState } from 'react';
import { Character, PlayerStats, CombatLogEntry, StatusEffect } from '../types';

interface Props {
  enemy: Character | null;
  playerHp: number;
  maxHp: number;
  playerStats: PlayerStats;
  combatLog: CombatLogEntry[];
  onAction: (action: string) => void;
  knownSpells: string[];
  playerEffects: StatusEffect[];
  isTutorialActive: boolean;
  onTutorialComplete: () => void;
  spellCooldowns: Record<string, number>;
}

export const CombatView: React.FC<Props> = ({ 
    enemy, playerHp, maxHp, playerStats, combatLog, onAction, knownSpells, playerEffects, isTutorialActive, onTutorialComplete, spellCooldowns
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [tutorialStep, setTutorialStep] = useState(1);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [combatLog]);

  if (!enemy) return null;

  const enemyHpPercent = enemy.hp && enemy.maxHp ? (enemy.hp / enemy.maxHp) * 100 : 100;
  const playerHpPercent = (playerHp / maxHp) * 100;
  const manaPercent = (playerStats.mana / playerStats.maxMana) * 100;

  // Render Status Effect Icon
  const StatusIcon = ({ effect }: { effect: StatusEffect }) => (
      <div className="relative group cursor-help">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm ${
              effect.type === 'buff' ? 'bg-blue-900/50 border-blue-400 text-blue-200' : 'bg-red-900/50 border-red-400 text-red-200'
          }`}>
              <span className="material-symbols-outlined text-sm">{effect.icon || 'circle'}</span>
          </div>
          <span className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-600">
              {effect.duration}
          </span>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-900 text-xs p-2 rounded border border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="font-bold">{effect.name}</div>
              <div className="text-slate-400">{effect.description}</div>
              {effect.element && <div className="text-xs text-purple-300 uppercase mt-1">{effect.element}</div>}
          </div>
      </div>
  );

  const getElementIcon = (el?: string) => {
      switch(el) {
          case 'fire': return 'local_fire_department';
          case 'ice': return 'ac_unit';
          case 'lightning': return 'bolt';
          case 'poison': return 'science';
          case 'earth': return 'landscape';
          case 'wind': return 'air';
          case 'holy': return 'auto_awesome';
          case 'dark': return 'dark_mode';
          default: return null;
      }
  };

  return (
    <div className="p-6 bg-red-950/30 backdrop-blur-xl border-t-4 border-red-600 shadow-[0_-10px_50px_rgba(220,38,38,0.3)] animate-slideUp h-full flex flex-col relative">
      
      {/* Tutorial Overlay */}
      {isTutorialActive && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center text-center p-4">
              <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl p-6 max-w-md shadow-2xl animate-fadeIn relative">
                  <h3 className="text-xl font-bold text-indigo-400 mb-2 fantasy-font">Combat Tutorial</h3>
                  
                  {tutorialStep === 1 && (
                      <div>
                          <p className="text-slate-300 mb-4">Welcome to Combat! This is a turn-based system. <br/>Keep an eye on your Health (Green) and Mana (Blue).</p>
                          <button onClick={() => setTutorialStep(2)} className="bg-indigo-600 px-4 py-2 rounded text-white font-bold hover:bg-indigo-500">Next: Actions</button>
                      </div>
                  )}
                  
                  {tutorialStep === 2 && (
                      <div>
                          <p className="text-slate-300 mb-4">Use <b>Attack</b> for physical damage (STR), or <b>Spells</b> for magic damage (INT). <br/>Spells now have <span className="text-yellow-400">Cooldowns</span>!</p>
                          <button onClick={() => setTutorialStep(3)} className="bg-indigo-600 px-4 py-2 rounded text-white font-bold hover:bg-indigo-500">Next: Elements</button>
                      </div>
                  )}

                  {tutorialStep === 3 && (
                      <div>
                           <p className="text-slate-300 mb-4">Enemies have <b>Weaknesses</b> and <b>Resistances</b>.<br/>High DEX grants <b>Critical Hits</b>. Good luck!</p>
                          <button onClick={onTutorialComplete} className="bg-green-600 px-4 py-2 rounded text-white font-bold hover:bg-green-500">Start Fight</button>
                      </div>
                  )}
                  
                  <div className="mt-4 flex justify-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${tutorialStep === 1 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${tutorialStep === 2 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${tutorialStep === 3 ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-4">
           <div>
              <h2 className="text-2xl md:text-3xl font-bold text-red-500 fantasy-font drop-shadow-lg flex items-center gap-2">
                <span className="material-symbols-outlined animate-pulse">swords</span>
                COMBAT: {enemy.name}
              </h2>
           </div>
           <div className="text-right">
             <div className="text-xs text-red-300 uppercase tracking-widest bg-red-900/50 px-2 py-1 rounded">Turn-Based Encounter</div>
           </div>
        </div>

        {/* Combat Arena (Bars & Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          
          {/* Player Side */}
          <div className="md:col-span-5 space-y-3 relative">
             <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between text-sm mb-1 text-slate-300 font-bold">
                    <span>YOU (Lvl 1)</span>
                    <span>{playerHp} / {maxHp} HP</span>
                </div>
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-2 border border-slate-600 relative">
                     <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-500" style={{ width: `${playerHpPercent}%` }}></div>
                </div>
                
                <div className="flex justify-between text-xs mb-1 text-blue-300 font-semibold">
                    <span>MANA</span>
                    <span>{playerStats.mana} / {playerStats.maxMana}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${manaPercent}%` }}></div>
                </div>

                {/* Status Effects Row */}
                <div className="flex gap-2 mt-2 h-8">
                    {playerEffects.map(effect => <StatusIcon key={effect.id} effect={effect} />)}
                </div>

                {/* Attributes */}
                <div className="flex justify-between mt-4 text-xs text-slate-400 border-t border-slate-700 pt-2">
                    <span title="Strength (Physical Dmg)">STR: <b className="text-white">{playerStats.str}</b></span>
                    <span title="Dexterity (Crit Chance)">DEX: <b className="text-white">{playerStats.dex}</b></span>
                    <span title="Intelligence (Magic Dmg)">INT: <b className="text-white">{playerStats.int}</b></span>
                </div>
             </div>
          </div>

          {/* VS Badge */}
          <div className="md:col-span-2 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold border-4 border-red-800 shadow-[0_0_20px_rgba(220,38,38,0.6)] z-10 animate-pulse-red">VS</div>
          </div>

          {/* Enemy Side */}
          <div className="md:col-span-5">
             <div className="bg-slate-900/80 p-4 rounded-xl border border-red-900/50 shadow-lg h-full flex flex-col justify-center relative overflow-hidden">
                <div className="flex justify-between text-sm mb-2 text-slate-300 font-bold relative z-10">
                    <span className="text-red-400">{enemy.name.toUpperCase()}</span>
                    <span>{enemy.hp} HP (Est)</span>
                </div>
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative z-10">
                    <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500" style={{ width: `${enemyHpPercent}%` }}></div>
                </div>
                
                {/* Enemy Effects */}
                <div className="flex gap-2 mt-3 h-8 relative z-10">
                    {enemy.activeEffects?.map(effect => <StatusIcon key={effect.id} effect={effect} />)}
                </div>

                <div className="flex gap-4 mt-4 relative z-10">
                    {enemy.resistances && enemy.resistances.length > 0 && (
                        <div className="text-[10px]">
                            <span className="text-slate-500 uppercase block mb-1">Resists</span>
                            <div className="flex gap-1">
                                {enemy.resistances.map(el => (
                                    <span key={el} title={el} className="text-slate-300 bg-slate-800 p-1 rounded">
                                        <span className="material-symbols-outlined text-[10px]">{getElementIcon(el)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {enemy.weaknesses && enemy.weaknesses.length > 0 && (
                        <div className="text-[10px]">
                            <span className="text-slate-500 uppercase block mb-1">Weak</span>
                            <div className="flex gap-1">
                                {enemy.weaknesses.map(el => (
                                    <span key={el} title={el} className="text-red-300 bg-red-900/30 p-1 rounded border border-red-900">
                                        <span className="material-symbols-outlined text-[10px]">{getElementIcon(el)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-500 mt-2 italic relative z-10">{enemy.description}</p>
             </div>
          </div>
        </div>

        {/* Combat Log Area */}
        <div className="flex-1 bg-black/40 rounded-lg border border-slate-700 p-3 mb-4 overflow-y-auto max-h-[200px] custom-scrollbar">
            <div className="space-y-2">
                {combatLog.length === 0 && <div className="text-slate-500 italic text-center text-sm">Combat started...</div>}
                {combatLog.map((log, idx) => {
                    const elIcon = getElementIcon(log.element);
                    return (
                        <div key={idx} className={`text-sm flex items-start gap-2 animate-fadeIn ${
                            log.isCritical ? 'font-bold text-yellow-300 text-base py-1' : ''
                        } ${
                            log.type === 'damage' && log.source === 'player' ? 'text-green-300' :
                            log.type === 'damage' && log.source === 'enemy' ? 'text-red-300' :
                            log.type === 'ability' ? 'text-orange-400 font-bold' :
                            log.type === 'heal' ? 'text-emerald-300' :
                            log.type === 'spell' ? 'text-purple-300' :
                            log.type === 'effect' ? 'text-yellow-300' :
                            'text-slate-300'
                        }`}>
                            <span className="material-symbols-outlined text-xs mt-0.5">
                                {log.isCritical ? 'stars' : 
                                 log.type === 'damage' ? 'swords' :
                                 log.type === 'heal' ? 'healing' :
                                 log.type === 'spell' ? 'auto_fix' :
                                 log.type === 'ability' ? 'flash_on' :
                                 log.type === 'effect' ? 'science' :
                                 log.type === 'miss' ? 'block' : 'info'}
                            </span>
                            <span className="flex items-center gap-1 flex-wrap">
                                {log.isCritical && <span className="text-yellow-500 uppercase tracking-wider text-[10px] border border-yellow-500 px-1 rounded">CRIT</span>}
                                {elIcon && <span className="material-symbols-outlined text-xs" title={log.element}>{elIcon}</span>}
                                {log.text}
                                {log.value && <span className="font-bold ml-1">({log.value})</span>}
                            </span>
                        </div>
                    );
                })}
                <div ref={logEndRef} />
            </div>
        </div>

        {/* Action Deck */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
           <button 
             onClick={() => onAction(`Attack ${enemy.name} with weapon`)}
             disabled={isTutorialActive}
             className="group p-3 bg-gradient-to-b from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg border border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-1 disabled:grayscale disabled:opacity-50"
           >
             <span className="material-symbols-outlined group-hover:animate-bounce">swords</span>
             ATTACK
           </button>
           
           <button 
             onClick={() => onAction("Defend")}
             disabled={isTutorialActive}
             className="group p-3 bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg border border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-1 disabled:grayscale disabled:opacity-50"
           >
             <span className="material-symbols-outlined group-hover:scale-110 transition-transform">shield</span>
             DEFEND
           </button>
           
           {/* Spells */}
           {knownSpells.length > 0 ? (
             <div className="col-span-2 grid grid-cols-2 gap-2">
                {knownSpells.map(spell => {
                    const cooldown = spellCooldowns[spell] || 0;
                    const onCooldown = cooldown > 0;
                    return (
                        <button 
                            key={spell}
                            onClick={() => onAction(`Cast ${spell}`)}
                            disabled={playerStats.mana < 5 || isTutorialActive || onCooldown} 
                            className={`relative p-2 bg-gradient-to-b from-purple-700 to-purple-900 text-white font-bold rounded-lg border border-purple-500/50 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-sm overflow-hidden
                                ${playerStats.mana < 5 || onCooldown ? 'opacity-70 cursor-not-allowed grayscale-[0.5]' : 'hover:from-purple-600 hover:to-purple-800 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]'}
                            `}
                        >
                            <span className="material-symbols-outlined text-sm">auto_fix</span>
                            {spell}
                            {onCooldown && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                                    <span className="text-lg font-bold text-white">{cooldown}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
             </div>
           ) : (
             <button disabled className="col-span-2 p-3 bg-slate-800 text-slate-500 font-bold rounded-lg border border-slate-700 cursor-not-allowed flex flex-col items-center justify-center">
                 <span className="material-symbols-outlined">lock</span>
                 <span>No Spells</span>
             </button>
           )}
        </div>
        <div className="mt-2 flex justify-end">
             <button 
                onClick={() => onAction("Flee")}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
            >
                <span className="material-symbols-outlined text-sm">logout</span>
                Attempt Flee
            </button>
        </div>
      </div>
    </div>
  );
};
