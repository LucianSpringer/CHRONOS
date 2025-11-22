import React, { useState } from 'react';
import { Character } from '../types';
import { quickItemExamine } from '../services/geminiService';

interface Props {
  character: Character;
}

export const CharacterItem: React.FC<Props> = ({ character }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<string | null>(null);

  const handleExamine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDetails && details) {
      setShowDetails(false);
      return;
    }
    
    setShowDetails(true);
    if (!details) {
        setLoading(true);
        try {
            const desc = await quickItemExamine(character.name + " (" + character.role + ")");
            setDetails(desc);
        } catch(e) {
            setDetails(character.description);
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <div 
        className="p-3 bg-slate-800/50 rounded-md border border-slate-700 hover:border-pink-500 transition-all duration-300 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:scale-[1.02] group cursor-pointer" 
        onClick={handleExamine}
    >
      <div className="flex justify-between items-center">
        <div>
            <span className="font-semibold text-slate-200 block">{character.name}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">{character.role}</span>
        </div>
        <span className="material-symbols-outlined text-slate-600 group-hover:text-pink-400 transition-colors text-lg">
          visibility
        </span>
      </div>
      {showDetails && (
        <div className="mt-2 text-xs text-slate-400 italic animate-fadeIn border-t border-slate-700 pt-2">
            {loading ? "Recalling..." : (details || character.description)}
        </div>
      )}
    </div>
  );
};