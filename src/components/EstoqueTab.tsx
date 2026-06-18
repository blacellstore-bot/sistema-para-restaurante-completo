import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { EstoqueItem } from '../types';

interface EstoqueTabProps {
  estoque: EstoqueItem[];
  setEstoque: (estoque: EstoqueItem[]) => void;
}

export default function EstoqueTab({ estoque, setEstoque }: EstoqueTabProps) {
  const [nome, setNome] = useState('');
  const [qtd, setQtd] = useState('');
  const [validade, setValidade] = useState('');

  const handleAdd = () => {
    if (!nome || !qtd || !validade) return;
    const novo: EstoqueItem = {
      id: Date.now(),
      nome,
      qtd,
      validade
    };
    setEstoque([...(Array.isArray(estoque) ? estoque : []), novo]);
    setNome(''); setQtd(''); setValidade('');
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const safeEstoque = Array.isArray(estoque) ? estoque : [];

  const estoqueOrdenado = [...safeEstoque].sort((a, b) => 
    new Date(a.validade).getTime() - new Date(b.validade).getTime()
  );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-indigo-800">Controle de Estoque e Validade 📦</h2>
      
      <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-indigo-700 mb-1">Nome do Produto</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Queijo Mussarela"
              className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-indigo-700 mb-1">Quantidade</label>
            <input 
              type="text" 
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              placeholder="Ex: 5 kg"
              className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-indigo-700 mb-1">Data de Validade</label>
            <input 
              type="date" 
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className="w-full p-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-4">
            <button 
              onClick={handleAdd}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition-all"
            >
              + Adicionar ao Estoque
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <AlertTriangle size={16} className="text-amber-500" />
        <em>Itens com validade de 7 dias ou menos ficarão destacados em vermelho.</em>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Quantidade</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Data Validade</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estoqueOrdenado.map((item) => {
              const dataVal = new Date(item.validade + 'T00:00:00');
              const diffTempo = dataVal.getTime() - hoje.getTime();
              const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));
              
              let statusText = "OK";
              let statusColor = "text-green-600";
              let rowClass = "";

              if (diffDias < 0) {
                statusText = "VENCIDO!";
                statusColor = "text-white font-black";
                rowClass = "bg-red-600 text-white";
              } else if (diffDias <= 7) {
                statusText = diffDias === 0 ? "Vence HOJE!" : `Vence em ${diffDias} dias!`;
                statusColor = "text-red-600 font-black";
                rowClass = "bg-red-50 animate-pulse";
              }

              return (
                <tr key={item.id} className={rowClass}>
                  <td className="p-4 font-bold">{item.nome}</td>
                  <td className="p-4">{item.qtd}</td>
                  <td className="p-4">{dataVal.toLocaleDateString('pt-BR')}</td>
                  <td className={`p-4 ${statusColor}`}>{statusText}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setEstoque(estoque.filter(x => x.id !== item.id))}
                      className={`p-2 rounded-lg transition-colors ${
                        diffDias < 0 ? "bg-white/20 text-white hover:bg-white/30" : "bg-gray-100 text-gray-400 hover:text-red-500"
                      }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {estoque.length === 0 && (
              <tr>
                <td colSpan={5} className="p-20 text-center text-gray-400 italic">Nenhum item cadastrado no estoque</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
