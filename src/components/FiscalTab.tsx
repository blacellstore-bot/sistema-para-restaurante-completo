import React, { useState } from 'react';
import { FileText, Settings, CheckCircle2, AlertCircle, Download, Send, Search } from 'lucide-react';
import { Config, PedidoOnline } from '../types';
import { dataService } from '../services/dataService';

interface FiscalTabProps {
  pedidosOnline: PedidoOnline[];
  config: Config;
  setConfig: (config: Config) => void;
}

export default function FiscalTab({ pedidosOnline, config, setConfig }: FiscalTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'emissao' | 'config'>('emissao');
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  // Fiscal Config State
  const [fiscalConfig, setFiscalConfig] = useState(config?.fiscal || {
    cnpj: '',
    inscricaoEstadual: '',
    csc: '',
    cscId: '',
    ambiente: 'homologacao',
    tokenApi: ''
  });

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const newConfig = { ...config, fiscal: fiscalConfig };
      await dataService.saveConfig(newConfig);
      setConfig(newConfig);
      alert('Configuração fiscal salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar configuração fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitirNFCe = async (pedido: PedidoOnline) => {
    if (!config.fiscal?.tokenApi) {
      alert('Configure o Token da API Fiscal primeiro!');
      setActiveSubTab('config');
      return;
    }

    setLoading(true);
    try {
      // In a real scenario, this would call a backend route that integrates with a fiscal API (e.g., Focus NFe)
      // For now, we simulate the process
      const response = await fetch('/api/fiscal/emitir-nfce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': localStorage.getItem('tenant_id') || '' },
        body: JSON.stringify({ pedidoId: pedido.id })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`NFC-e emitida com sucesso! Chave: ${result.chave}`);
        // Refresh orders to show the key
        window.location.reload();
      } else {
        alert(`Erro na emissão: ${result.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o serviço fiscal');
    } finally {
      setLoading(false);
    }
  };

  const pedidosConcluidos = pedidosOnline.filter(p => 
    p.status === 'Concluido' && 
    (p.identificacao.toLowerCase().includes(busca.toLowerCase()) || p.codigoComanda.toString().includes(busca))
  ).sort((a, b) => (b.horaConclusao || 0) - (a.horaConclusao || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-blue-800 flex items-center gap-2">
          Gestão Fiscal (NFC-e) 📄
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveSubTab('emissao')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'emissao' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            Emissão de Notas
          </button>
          <button 
            onClick={() => setActiveSubTab('config')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            Configuração SEFAZ
          </button>
        </div>
      </div>

      {activeSubTab === 'emissao' ? (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
              <input 
                type="text" 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-gray-700 shadow-sm transition-all"
                placeholder="Buscar por Mesa, Cliente ou Comanda..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pedidosConcluidos.map((ped) => (
              <div key={ped.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900">Comanda #{ped.codigoComanda} - {ped.identificacao}</h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                      {ped.hora} • Total: R$ {Number(ped.total).toFixed(2)} • {ped.origem}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {ped.fiscal_chave ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => alert(`Consultando chave: ${ped.fiscal_chave}`)}
                          className="bg-emerald-100 text-emerald-700 font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-200 transition-all"
                        >
                          Consultar
                        </button>
                        <button 
                          onClick={() => window.open(`https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ7h1i6u0=&chaveConsulta=${ped.fiscal_chave}`, '_blank')}
                          className="bg-blue-100 text-blue-700 font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-all flex items-center gap-2"
                        >
                          <Download size={12} /> PDF
                        </button>
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono">{ped.fiscal_chave}</span>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleEmitirNFCe(ped)}
                        disabled={loading}
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                      >
                        <Send size={16} /> Emitir NFC-e
                      </button>
                      <button className="p-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all">
                        <Download size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {pedidosConcluidos.length === 0 && (
              <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-4">
                <FileText size={64} className="opacity-10" />
                <p className="text-xl font-bold italic">Nenhum pedido concluído para emissão.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Configuração Fiscal</h3>
              <p className="text-xs text-gray-500 font-bold">Dados necessários para integração com a SEFAZ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">CNPJ da Empresa</label>
              <input 
                type="text" 
                value={fiscalConfig.cnpj}
                onChange={(e) => setFiscalConfig({...fiscalConfig, cnpj: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Inscrição Estadual</label>
              <input 
                type="text" 
                value={fiscalConfig.inscricaoEstadual}
                onChange={(e) => setFiscalConfig({...fiscalConfig, inscricaoEstadual: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
                placeholder="000.000.000.000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">CSC (Token SEFAZ)</label>
              <input 
                type="text" 
                value={fiscalConfig.csc}
                onChange={(e) => setFiscalConfig({...fiscalConfig, csc: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
                placeholder="Código de Segurança"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">ID do CSC</label>
              <input 
                type="text" 
                value={fiscalConfig.cscId}
                onChange={(e) => setFiscalConfig({...fiscalConfig, cscId: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
                placeholder="000001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ambiente</label>
              <select 
                value={fiscalConfig.ambiente}
                onChange={(e) => setFiscalConfig({...fiscalConfig, ambiente: e.target.value as any})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
              >
                <option value="homologacao">Homologação (Testes)</option>
                <option value="producao">Produção (Real)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Token API Fiscal</label>
              <input 
                type="password" 
                value={fiscalConfig.tokenApi}
                onChange={(e) => setFiscalConfig({...fiscalConfig, tokenApi: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all"
                placeholder="••••••••••••••••"
              />
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Para emitir NFC-e, você precisa de um <strong>Certificado Digital A1</strong> instalado no servidor e estar credenciado na SEFAZ do seu estado. Recomendamos o uso de APIs como Focus NFe ou PlugNotas para facilitar o processo.
            </p>
          </div>

          <button 
            onClick={handleSaveConfig}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading ? 'Salvando...' : <><CheckCircle2 size={20} /> Salvar Configuração Fiscal</>}
          </button>
        </div>
      )}
    </div>
  );
}
