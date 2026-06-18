import React, { useState } from 'react';
import { Trash2, User as UserIcon, Search, Building2, Loader2 } from 'lucide-react';
import { Cliente } from '../types';

interface ClientesTabProps {
  clientes: Cliente[];
  setClientes: (clientes: Cliente[]) => void;
  empresas: string[];
  setEmpresas: (empresas: string[]) => void;
}

export default function ClientesTab({ clientes, setClientes, empresas, setEmpresas }: ClientesTabProps) {
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [novoCnpjEmpresa, setNovoCnpjEmpresa] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [tel, setTel] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [isCnpj, setIsCnpj] = useState(false);

  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeEmpresas = Array.isArray(empresas) ? empresas : [];

  const handleAddEmpresa = () => {
    if (!novaEmpresa) return;
    setEmpresas([...safeEmpresas, novaEmpresa]);
    setNovaEmpresa('');
    setNovoCnpjEmpresa('');
  };

  const handleConsultarCNPJ = async (cnpjInput: string, target: 'empresa' | 'cliente') => {
    const limpo = cnpjInput.replace(/\D/g, '');
    if (limpo.length !== 14) {
      alert('CNPJ deve ter 14 dígitos');
      return;
    }

    setLoadingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (response.ok) {
        const data = await response.json();
        if (target === 'empresa') {
          setNovaEmpresa(data.razao_social || data.nome_fantasia);
        } else {
          setNome(data.razao_social || data.nome_fantasia);
        }
      } else {
        alert('CNPJ não encontrado ou erro na Brasil API');
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      alert('Erro ao conectar com a Brasil API');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleAddCliente = () => {
    if (!nome || (!cpf && !cnpj) || !empresa) return;
    const novo: Cliente = {
      id: Date.now(),
      codigo: Math.floor(1000 + Math.random() * 9000),
      nome,
      empresa,
      tel,
      cpf: isCnpj ? '' : cpf,
      cnpj: isCnpj ? cnpj : ''
    };
    setClientes([...safeClientes, novo]);
    setNome(''); setEmpresa(''); setTel(''); setCpf(''); setCnpj('');
  };

  const handleDeleteCliente = (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    setClientes(safeClientes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 h-fit">
          <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
            <Building2 size={20} />
            1. Cadastrar Empresas
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={novoCnpjEmpresa}
                onChange={(e) => setNovoCnpjEmpresa(e.target.value)}
                className="flex-1 px-4 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="CNPJ da empresa (opcional)..."
              />
              <button 
                onClick={() => handleConsultarCNPJ(novoCnpjEmpresa, 'empresa')}
                disabled={loadingCnpj}
                className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Consultar na Brasil API"
              >
                {loadingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Consultar
              </button>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={novaEmpresa}
                onChange={(e) => setNovaEmpresa(e.target.value)}
                className="flex-1 px-4 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Nome da empresa..."
              />
              <button 
                onClick={handleAddEmpresa}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {safeEmpresas.map((e, i) => (
              <span key={i} className="bg-white border border-blue-200 px-3 py-1 rounded-full text-sm font-medium text-blue-700 flex items-center gap-2">
                {e}
                <button onClick={() => setEmpresas(safeEmpresas.filter((_, idx) => idx !== i))} className="text-red-500 font-bold hover:text-red-700">×</button>
              </span>
            ))}
            {safeEmpresas.length === 0 && <p className="text-blue-400 text-xs italic">Nenhuma empresa cadastrada</p>}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-gray-800 mb-4">2. Cadastrar Cliente (Fiado)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Empresa</label>
              <select 
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Selecione --</option>
                {safeEmpresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (DDD+Num)</label>
              <input 
                type="text" 
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="Ex: 62999998888"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                {isCnpj ? 'CNPJ' : 'CPF'}
                <button 
                  onClick={() => setIsCnpj(!isCnpj)}
                  className="text-[10px] text-blue-600 font-bold uppercase hover:underline"
                >
                  Mudar para {isCnpj ? 'CPF' : 'CNPJ'}
                </button>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={isCnpj ? cnpj : cpf}
                  onChange={(e) => isCnpj ? setCnpj(e.target.value) : setCpf(e.target.value)}
                  placeholder={isCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isCnpj && (
                  <button 
                    onClick={() => handleConsultarCNPJ(cnpj, 'cliente')}
                    disabled={loadingCnpj}
                    className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    title="Consultar na Brasil API"
                  >
                    {loadingCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <button 
                onClick={handleAddCliente}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
              >
                Cadastrar Cliente
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <UserIcon className="text-blue-600" />
            Clientes Cadastrados
          </h3>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
            {safeClientes.length} Total
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cód.</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">WhatsApp</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {safeClientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm font-bold text-blue-600">#{c.codigo}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{c.nome}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {c.cnpj ? `CNPJ: ${c.cnpj}` : `CPF: ${c.cpf}`}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {c.empresa}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium">{c.tel}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteCliente(c.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Cliente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {safeClientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-400 italic">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
