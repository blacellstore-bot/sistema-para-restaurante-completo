import React, { useState } from 'react';
import { Plus, Trash2, Save, ExternalLink, Smartphone, Globe, ShieldCheck, AlertCircle } from 'lucide-react';
import { DeliveryConfig } from '../types';
import { dataService } from '../services/dataService';

interface DeliveryTabProps {
  deliveryConfigs: DeliveryConfig[];
  setDeliveryConfigs: (configs: DeliveryConfig[]) => void;
}

const PLATFORMS = [
  { id: 'ifood', name: 'iFood', color: 'bg-red-600', icon: '🍔' },
  { id: 'ubereats', name: 'Uber Eats', color: 'bg-green-600', icon: '🚗' },
  { id: 'rappi', name: 'Rappi', color: 'bg-orange-500', icon: '🚲' },
  { id: '99food', name: '99Food', color: 'bg-yellow-500', icon: '🍕' },
  { id: 'aiqfome', name: 'Aiqfome', color: 'bg-purple-600', icon: '💜' },
  { id: 'deliverymuch', name: 'Delivery Much', color: 'bg-red-500', icon: '🍒' },
  { id: 'keeta', name: 'Keeta', color: 'bg-blue-600', icon: '🥡' },
  { id: 'outro', name: 'Outro (API Aberta)', color: 'bg-gray-600', icon: '🔌' },
];

export default function DeliveryTab({ deliveryConfigs, setDeliveryConfigs }: DeliveryTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<DeliveryConfig>>({
    platform: 'ifood',
    active: true,
    apiKey: '',
    apiSecret: '',
    merchantId: ''
  });

  const handleSave = async () => {
    try {
      if (isAdding) {
        await dataService.saveDeliveryConfig(newConfig);
      }
      const configs = await dataService.getDeliveryConfigs();
      setDeliveryConfigs(configs);
      setIsAdding(false);
      setNewConfig({ platform: 'ifood', active: true, apiKey: '', apiSecret: '', merchantId: '' });
    } catch (err) {
      console.error('Erro ao salvar configuração de delivery:', err);
      alert('Erro ao salvar configuração. Verifique os dados e tente novamente.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta integração?')) return;
    try {
      await dataService.deleteDeliveryConfig(id);
      const configs = await dataService.getDeliveryConfigs();
      setDeliveryConfigs(configs);
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const toggleActive = async (config: DeliveryConfig) => {
    try {
      await dataService.updateDeliveryConfig(config.id, { ...config, active: !config.active });
      const configs = await dataService.getDeliveryConfigs();
      setDeliveryConfigs(configs);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b-2 border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            Integração Delivery 🚀
          </h2>
          <p className="text-gray-500 text-sm font-medium">Conecte seu restaurante aos principais aplicativos do mercado.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          Nova Integração
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-3xl p-8 border-2 border-blue-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Plataforma</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setNewConfig({ ...newConfig, platform: p.id as any })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      newConfig.platform === p.id 
                        ? "border-blue-600 bg-blue-50 ring-4 ring-blue-50" 
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-xs font-black uppercase">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID do Estabelecimento (Merchant ID)</label>
                  <input 
                    type="text"
                    value={newConfig.merchantId}
                    onChange={e => setNewConfig({ ...newConfig, merchantId: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none transition-colors"
                    placeholder="Ex: 12345678-abcd-1234-efgh-1234567890ab"
                  />
                </div>

                {newConfig.platform !== 'ifood' && 
                 newConfig.platform !== 'ubereats' && 
                 newConfig.platform !== 'rappi' && 
                 newConfig.platform !== '99food' &&
                 newConfig.platform !== 'aiqfome' &&
                 newConfig.platform !== 'deliverymuch' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chave da API (Client ID / API Key)</label>
                      <input 
                        type="text"
                        value={newConfig.apiKey}
                        onChange={e => setNewConfig({ ...newConfig, apiKey: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none transition-colors"
                        placeholder="Cole sua chave aqui"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Segredo da API (Client Secret)</label>
                      <input 
                        type="password"
                        value={newConfig.apiSecret}
                        onChange={e => setNewConfig({ ...newConfig, apiSecret: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none transition-colors"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </>
                )}

                {(newConfig.platform === 'ifood' || 
                  newConfig.platform === 'ubereats' || 
                  newConfig.platform === 'rappi' ||
                  newConfig.platform === '99food' ||
                  newConfig.platform === 'aiqfome' ||
                  newConfig.platform === 'deliverymuch') && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                      <span className="block mb-1 font-black uppercase tracking-widest">Modo Facilitado Ativo ⚡</span>
                      Para o {PLATFORMS.find(p => p.id === newConfig.platform)?.name}, você só precisa do seu **Merchant ID**. 
                      Nós cuidamos da conexão técnica usando nossas chaves de parceiro.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={20} />
                  Salvar Integração
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              Para integrar com iFood, Uber Eats ou Rappi, você precisa ter uma conta de desenvolvedor aprovada na plataforma correspondente. 
              Os pedidos recebidos aparecerão automaticamente no seu <span className="underline">Monitor da Cozinha</span>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deliveryConfigs.map(config => {
          const platform = PLATFORMS.find(p => p.id === config.platform) || PLATFORMS[5];
          return (
            <div key={config.id} className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${platform.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800">{platform.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {config.active ? 'Conectado' : 'Desativado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleActive(config)}
                      className={`p-2 rounded-xl transition-all ${config.active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      title={config.active ? "Desativar" : "Ativar"}
                    >
                      <ShieldCheck size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(config.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Merchant ID</span>
                    <span className="text-sm font-bold text-gray-700">{config.merchantId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">API Key</span>
                    <span className="text-sm font-bold text-gray-700 font-mono">
                      {config.apiKey.substring(0, 8)}...{config.apiKey.substring(config.apiKey.length - 4)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button className="flex-1 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-600 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Smartphone size={16} />
                    Testar Conexão
                  </button>
                  <button className="flex-1 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-600 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Globe size={16} />
                    Portal {platform.name}
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {deliveryConfigs.length === 0 && !isAdding && (
          <div className="col-span-full py-20 bg-gray-50 rounded-[40px] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 text-4xl">
              🔌
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">Nenhuma integração ativa</h3>
            <p className="text-gray-500 font-bold max-w-sm">
              Conecte seu restaurante ao iFood, Uber Eats e outros para receber pedidos automaticamente aqui.
            </p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 transition-all active:scale-95"
            >
              Começar Agora
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-[40px] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Como funciona?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black">1</div>
              <h4 className="font-black uppercase tracking-widest text-blue-400">Configure</h4>
              <p className="text-sm text-gray-400 font-medium">Insira as chaves de API fornecidas pelo portal do parceiro de cada plataforma.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black">2</div>
              <h4 className="font-black uppercase tracking-widest text-blue-400">Sincronize</h4>
              <p className="text-sm text-gray-400 font-medium">Nosso sistema se conecta via Webhook ou Polling para capturar novos pedidos em tempo real.</p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black">3</div>
              <h4 className="font-black uppercase tracking-widest text-blue-400">Prepare</h4>
              <p className="text-sm text-gray-400 font-medium">Os pedidos caem direto no Monitor da Cozinha com a etiqueta da plataforma de origem.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
