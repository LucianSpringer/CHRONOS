import React from 'react';
import { ImageResolution, Settings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (s: Settings) => void;
  onRequestApiKey: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdateSettings, onRequestApiKey }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-indigo-400 fantasy-font">Realm Settings</h2>
        
        <div className="space-y-6">
          {/* Image Resolution */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image Clarity (Resolution)</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(ImageResolution).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateSettings({ ...settings, imageResolution: res })}
                  className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                    settings.imageResolution === res
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Art Style */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Artistic Vision</label>
            <select
              value={settings.artStyle}
              onChange={(e) => onUpdateSettings({ ...settings, artStyle: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Dark Fantasy Oil Painting">Dark Fantasy Oil Painting</option>
              <option value="Cyberpunk Noir">Cyberpunk Noir</option>
              <option value="Watercolor Dream">Watercolor Dream</option>
              <option value="Retro Pixel Art">Retro Pixel Art</option>
              <option value="Studio Ghibli Style">Studio Ghibli Style</option>
            </select>
          </div>

           {/* API Key Reset */}
           <div className="pt-4 border-t border-slate-800">
             <button
               onClick={onRequestApiKey}
               className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-yellow-500 rounded-md transition-colors text-sm"
             >
               Reset / Select API Key
             </button>
             <p className="text-xs text-slate-500 mt-2 text-center">
               Access high-fidelity models via Google AI Studio.
             </p>
           </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/25"
        >
          Return to Adventure
        </button>
      </div>
    </div>
  );
};
