
import React, { useEffect, useState } from 'react';

interface Props {
  spellName: string | null;
  onComplete: () => void;
}

export const SpellOverlay: React.FC<Props> = ({ spellName, onComplete }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (spellName) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        onComplete();
      }, 1500); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [spellName, onComplete]);

  if (!active || !spellName) return null;

  // Determine color/style based on common keywords
  let colorClass = "from-purple-500 via-fuchsia-500 to-indigo-500"; // Default Arcane
  let icon = "auto_fix";
  
  const lower = spellName.toLowerCase();
  if (lower.includes("fire") || lower.includes("flame") || lower.includes("burn")) {
    colorClass = "from-red-500 via-orange-500 to-yellow-500";
    icon = "local_fire_department";
  } else if (lower.includes("ice") || lower.includes("frost") || lower.includes("freeze")) {
    colorClass = "from-cyan-400 via-blue-500 to-indigo-600";
    icon = "ac_unit";
  } else if (lower.includes("heal") || lower.includes("light") || lower.includes("cure")) {
    colorClass = "from-green-400 via-emerald-500 to-teal-500";
    icon = "healing";
  } else if (lower.includes("dark") || lower.includes("shadow") || lower.includes("void")) {
    colorClass = "from-gray-900 via-purple-900 to-black";
    icon = "dark_mode";
  } else if (lower.includes("thunder") || lower.includes("bolt") || lower.includes("shock")) {
    colorClass = "from-yellow-400 via-yellow-200 to-amber-500";
    icon = "bolt";
  }

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Radial Blast */}
      <div className={`absolute w-full h-full opacity-0 animate-spellPulse bg-gradient-to-r ${colorClass} mix-blend-screen`}></div>
      
      {/* Central Icon Blast */}
      <div className="relative z-10 flex flex-col items-center animate-spellZoom">
        <div className={`p-8 rounded-full bg-gradient-to-br ${colorClass} shadow-[0_0_100px_rgba(255,255,255,0.5)]`}>
             <span className="material-symbols-outlined text-8xl text-white drop-shadow-lg">{icon}</span>
        </div>
        <h2 className="mt-4 text-4xl font-bold text-white fantasy-font drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] uppercase tracking-widest">
          {spellName}
        </h2>
      </div>
      
      {/* Particles (Simulated with CSS) */}
      <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full animate-particle1"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full animate-particle2"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full animate-particle3"></div>
      </div>
      
      <style>{`
        @keyframes spellPulse {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 0.6; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes spellZoom {
          0% { opacity: 0; transform: scale(0) rotate(-45deg); }
          20% { opacity: 1; transform: scale(1.2) rotate(0deg); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes particle1 { 0% { transform: translate(0,0); opacity: 1; } 100% { transform: translate(-200px, -200px); opacity: 0; } }
        @keyframes particle2 { 0% { transform: translate(0,0); opacity: 1; } 100% { transform: translate(200px, -100px); opacity: 0; } }
        @keyframes particle3 { 0% { transform: translate(0,0); opacity: 1; } 100% { transform: translate(0, 200px); opacity: 0; } }
      `}</style>
    </div>
  );
};
