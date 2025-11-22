

import React, { useState } from 'react';
import { InventoryItem as IInventoryItem, Rarity } from '../types';
import { quickItemExamine } from '../services/geminiService';

interface Props {
  item: IInventoryItem;
  onUse?: (item: IInventoryItem) => void;
}

const getRarityColor = (rarity?: Rarity) => {
    switch (rarity) {
        case 'legendary': return 'border-orange-500 shadow-orange-500/20 bg-orange-950/20';
        case 'epic': return 'border-purple-500 shadow-purple-500/20 bg-purple-950/20';
        case 'rare': return 'border-blue-500 shadow-blue-500/20 bg-blue-950/20';
        case 'uncommon': return 'border-green-500 shadow-green-500/20 bg-green-950/20';
        default: return 'border-slate-700 bg-slate-800/50';
    }
};

const getRarityText = (rarity?: Rarity) => {
    switch (rarity) {
        case 'legendary': return 'text-orange-400';
        case 'epic': return 'text-purple-400';
        case 'rare': return 'text-blue-400';
        case 'uncommon': return 'text-green-400';
        default: return 'text-slate-400';
    }
};

export const InventoryItem: React.FC<Props> = ({ item, onUse }) => {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExamine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (description) {
      setDescription(null); 
      return;
    }
    
    // If we already have a description from the AI update, use it
    if (item.description && item.description.length > 5) {
        setDescription(item.description);
        return;
    }

    setLoading(true);
    try {
      const desc = await quickItemExamine(item.name);
      setDescription(desc);
    } catch (err) {
      setDescription("Failed to examine.");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onUse) onUse(item);
  };

  const hasEffects = item.effects && item.effects.length > 0;
  const maxDur = item.maxDurability || 0;
  const curDur = item.currentDurability ?? maxDur;
  const durabilityPct = maxDur > 0 ? (curDur / maxDur) * 100 : 0;
  const isBroken = maxDur > 0 && curDur === 0;

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

  const rarityClass = getRarityColor(item.rarity);
  const rarityTextClass = getRarityText(item.rarity);

  return (
    <div 
        className={`p-3 rounded-md border transition-all duration-300 group relative cursor-pointer ${
            isBroken 
                ? 'bg-red-900/10 border-red-800 opacity-60 grayscale-[0.5]' 
                : `${rarityClass} hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-[1.02]`
        }`} 
        onClick={handleExamine}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 overflow-hidden">
            {item.icon && <span className={`material-symbols-outlined text-sm ${rarityTextClass}`}>{item.icon}</span>}
            <div className="flex flex-col">
                <span className={`font-semibold truncate ${isBroken ? 'text-red-400 line-through' : 'text-slate-200'}`}>{item.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider flex gap-1">
                    {item.rarity && <span className={rarityTextClass}>{item.rarity}</span>}
                    {item.itemType && <span>• {item.itemType}</span>}
                </span>
            </div>
            {item.consumable && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded ml-1 shrink-0">x1</span>}
        </div>
        
        {hasEffects && !isBroken ? (
             <button 
                onClick={handleUse}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors shadow-lg z-10 shrink-0"
             >
                Use
             </button>
        ) : (
             isBroken ? (
                <span className="text-[10px] text-red-500 font-bold border border-red-500/50 px-1 rounded shrink-0">BROKEN</span>
             ) : (
                <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {loading ? '...' : 'Examine'}
                </span>
             )
        )}
      </div>
      
      {/* Durability Bar */}
      {maxDur > 0 && (
          <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                    durabilityPct < 20 ? 'bg-red-500' : durabilityPct < 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`} 
                style={{ width: `${durabilityPct}%` }}
              ></div>
          </div>
      )}
      
      {/* Effect Badges */}
      {hasEffects && (
          <div className="flex gap-1 mt-1 flex-wrap">
              {item.effects?.map((eff, i) => {
                  const elIcon = getElementIcon(eff.element);
                  return (
                    <span key={i} className={`flex items-center gap-1 text-[10px] px-1 rounded border ${
                        eff.type.includes('heal') ? 'bg-green-900/30 border-green-500/30 text-green-300' :
                        eff.type === 'buff' ? 'bg-blue-900/30 border-blue-500/30 text-blue-300' :
                        eff.type === 'learn_spell' ? 'bg-yellow-900/30 border-yellow-500/30 text-yellow-200' :
                        eff.element ? 'bg-purple-900/30 border-purple-500/30 text-purple-200' :
                        'bg-slate-700 border-slate-600 text-slate-300'
                    }`}>
                        {elIcon && <span className="material-symbols-outlined text-[10px]">{elIcon}</span>}
                        {eff.type === 'heal_hp' && `+${eff.value} HP`}
                        {eff.type === 'heal_mana' && `+${eff.value} Mana`}
                        {eff.type === 'buff' && `${eff.statusEffect?.name}`}
                        {eff.type === 'learn_spell' && `Learn: ${eff.spellName}`}
                        {eff.type === 'damage' && `Dmg`}
                    </span>
                  );
              })}
          </div>
      )}

      {description && (
        <div className="mt-2 text-xs text-slate-400 italic animate-fadeIn">
          "{description}"
        </div>
      )}
    </div>
  );
};
