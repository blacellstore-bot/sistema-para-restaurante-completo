import React from 'react';
import { Config, User } from '../types';
import { dataService } from '../services/dataService';
import { Database, ShieldCheck, Info } from 'lucide-react';

interface ConfigTabProps {
  config: Config;
  setConfig: (config: Config) => void;
  currentUser: User | null;
}

export default function ConfigTab({ config, setConfig, currentUser }: ConfigTabProps) {
  const [dbHealth, setDbHealth] = React.useState<any>(null);

  React.useEffect(() => {
    if (currentUser?.role === 'admin') {
      dataService.getHealth().then(setDbHealth).catch(err => console.error('Health error:', err));
    }
  }, [currentUser]);

  if (!config) return (
    <div className="p-8 text-center text-gray-500">
      <Info className="mx-auto mb-2 opacity-20" size={48} />
      <p className="font-bold">Carregando configurações...</p>
    </div>
  );

  const handleChange = (field: keyof Config, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-black text-gray-800 border-b-2 border-gray-100 pb-4">Configurações Gerais ⚙️</h2>
      
      <div className="space-y-6">
        {isAdmin && (
          <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl space-y-4 border-4 border-gray-800">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <ShieldCheck className="text-blue-400" size={24} />
              <h3 className="font-black uppercase tracking-tighter text-xl">Status do Sistema</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID da Empresa (Tenant)</p>
                <p className="text-xl font-mono font-black text-blue-400">{currentUser?.tenant_id || 'Não identificado'}</p>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Banco de Dados</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${dbHealth?.db === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className={`text-lg font-black uppercase tracking-tighter ${dbHealth?.db === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {dbHealth?.db === 'connected' ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>
              </div>
            </div>

            {dbHealth?.db !== 'connected' && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                <Info className="text-red-400 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-200">Erro na conexão MySQL:</p>
                  <p className="text-[10px] font-mono text-red-300 break-all">{dbHealth?.dbError || 'Verifique as variáveis de ambiente no seu servidor.'}</p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-[10px] text-gray-500 font-bold italic">
                * Se os dados não aparecem, verifique se o "ID da Empresa" acima é o mesmo que você usava anteriormente.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-blue-600 uppercase text-xs tracking-widest">Dados de Pagamento (PIX)</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
            <input 
              type="text" 
              value={config.pix || ''}
              onChange={(e) => handleChange('pix', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E-mail, CPF, CNPJ ou Aleatória"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Beneficiário</label>
            <input 
              type="text" 
              value={config.beneficiario || ''}
              onChange={(e) => handleChange('beneficiario', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Banco</label>
            <input 
              type="text" 
              value={config.nomeBanco || ''}
              onChange={(e) => handleChange('nomeBanco', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-amber-600 uppercase text-xs tracking-widest">Personalização do Recibo</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instruções no Recibo</label>
            <textarea 
              value={config.obs || ''}
              onChange={(e) => handleChange('obs', e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Ex: Obrigado pela preferência! Pagamento até o dia 10."
            />
          </div>
        </div>

        <button 
          onClick={() => alert("Configurações salvas com sucesso!")}
          className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-lg transition-all text-lg"
        >
          💾 Salvar Configurações
        </button>
      </div>
    </div>
  );
}
