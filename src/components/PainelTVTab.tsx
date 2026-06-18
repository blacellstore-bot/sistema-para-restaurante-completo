import React, { useRef, useState, useEffect } from 'react';
import { Tv, Maximize, Minimize, Volume2, VolumeX, Bell } from 'lucide-react';
import { PedidoOnline } from '../types';

interface PainelTVTabProps {
  pedidosOnline: PedidoOnline[];
}

const ALERT_SOUNDS = [
  { id: 'bell1', name: 'Sino Clássico 🔔', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'bell2', name: 'Sino de Mesa 🛎️', url: 'https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3' },
  { id: 'bell3', name: 'Ding de Balcão 🛎️', url: 'https://assets.mixkit.co/active_storage/sfx/2908/2908-preview.mp3' },
  { id: 'bell4', name: 'Sino de Serviço ✨', url: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3' },
  { id: 'bell5', name: 'Toque Curto 🎵', url: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3' },
  { id: 'bell6', name: 'Sino Agudo 🔔', url: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3' },
  { id: 'bell7', name: 'Sino de Recepção 🛎️', url: 'https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3' },
  { id: 'custom', name: '📂 Arquivo do PC...', url: 'custom' }
];

export default function PainelTVTab({ pedidosOnline }: PainelTVTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState(ALERT_SOUNDS[0].url);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const prevTopOrderId = useRef<number | null>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const concluidos = Array.isArray(pedidosOnline) 
    ? pedidosOnline
        .filter(p => {
          const isReady = p.status === 'Pronto' || p.status === 'Concluido';
          if (!isReady) return false;
          
          // Filtro de 1 hora (3.600.000 ms)
          const umaHoraEmMs = 3600000;
          const agora = Date.now();
          const tempoDesdeConclusao = agora - (Number(p.horaConclusao) || 0);
          
          return tempoDesdeConclusao < umaHoraEmMs;
        })
        .sort((a, b) => (Number(b.horaConclusao) || 0) - (Number(a.horaConclusao) || 0))
        .slice(0, 10)
    : [];

  const destaque = concluidos[0];

  // Logic to play sound when a new order appears
  useEffect(() => {
    if (destaque && destaque.id !== prevTopOrderId.current) {
      if (soundEnabled && prevTopOrderId.current !== null) {
        const playUrl = selectedSound === 'custom' ? customSoundUrl : selectedSound;
        if (playUrl) {
          const audio = new Audio(playUrl);
          audio.play().catch(e => console.error("Erro ao tocar som (interação necessária):", e));
        }
      }
      prevTopOrderId.current = destaque.id;
    }
  }, [destaque, soundEnabled, selectedSound, customSoundUrl]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Erro ao entrar em tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    // Enable sound on interaction
    setSoundEnabled(true);
  };

  const testSound = (url: string) => {
    const playUrl = url === 'custom' ? customSoundUrl : url;
    if (playUrl) {
      const audio = new Audio(playUrl);
      audio.play();
      setSoundEnabled(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomSoundUrl(url);
      setSelectedSound('custom');
      testSound(url);
    }
  };

  return (
    <div ref={containerRef} className="bg-white rounded-3xl p-8 border-4 border-gray-100 shadow-2xl min-h-[70vh] flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b-4 border-gray-100 pb-6 gap-6">
        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-200">
           <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl transition-all ${soundEnabled ? "bg-green-600 text-white shadow-lg shadow-green-100" : "bg-gray-200 text-gray-500"}`}
           >
             {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
           </button>
           <select 
            value={selectedSound}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                fileInputRef.current?.click();
              } else {
                setSelectedSound(val);
                testSound(val);
              }
            }}
            className="bg-transparent border-none outline-none font-black text-xs uppercase tracking-widest text-gray-700 cursor-pointer max-w-[150px] truncate"
           >
             {ALERT_SOUNDS.map(s => (
               <option key={s.id} value={s.url}>{s.name}</option>
             ))}
           </select>
        </div>

        <h2 className="text-center text-gray-800 text-4xl font-black uppercase tracking-tighter">
          Retirada de Pedidos
        </h2>

        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors shadow-sm"
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Destaque */}
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-[40px] border-[12px] border-white shadow-inner p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500 animate-pulse"></div>
          
          <h3 className="text-3xl font-black text-gray-400 uppercase tracking-widest mb-4">Pronto agora!</h3>
          
          <div className="text-[12rem] font-black text-gray-900 leading-none tracking-tighter mb-6">
            {destaque ? destaque.codigoComanda : '---'}
          </div>
          
          <div className="text-5xl font-black text-green-600 truncate w-full px-4">
            {destaque ? destaque.identificacao : 'Aguardando...'}
          </div>

          {destaque && (
            <div className="mt-10 flex items-center gap-2 text-green-500 animate-bounce">
              <span className="text-2xl font-bold">Por favor, retire seu pedido</span>
            </div>
          )}
        </div>

        {/* Lista de Próximos */}
        <div className="bg-gray-900 rounded-[40px] p-8 flex flex-col shadow-2xl">
          <h3 className="text-gray-400 text-center text-2xl font-black uppercase tracking-widest mb-8 border-b-2 border-gray-800 pb-6">
            Histórico Recente
          </h3>
          
          <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            {concluidos.map((ped, i) => (
              <div 
                key={ped.id} 
                className={`flex justify-between items-center p-6 rounded-2xl border-l-8 transition-all ${
                  i === 0 
                    ? "bg-gray-800 border-green-500 scale-105 shadow-lg" 
                    : "bg-gray-800/50 border-gray-700 opacity-60"
                }`}
              >
                <span className="text-4xl font-black text-white tracking-tighter w-32">
                  {ped.codigoComanda}
                </span>
                <span className="text-2xl font-bold text-gray-300 truncate flex-1 text-right">
                  {ped.identificacao}
                </span>
              </div>
            ))}
            {concluidos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 py-20">
                <Tv size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-bold italic">Nenhum pedido pronto no momento</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
