import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, Phone } from 'lucide-react';
import { Cliente, Venda, Config } from '../types';

interface RelatorioTabProps {
  clientes: Cliente[];
  vendas: Venda[];
  setVendas: (vendas: Venda[]) => void;
  config: Config;
}

export default function RelatorioTab({ clientes, vendas, setVendas, config }: RelatorioTabProps) {
  const [busca, setBusca] = useState('');
  const [modalPagamento, setModalPagamento] = useState<{ id: number, nome: string, valor: number } | null>(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeVendas = Array.isArray(vendas) ? vendas : [];

  const handlePagar = () => {
    if (!modalPagamento) return;
    const novasVendas = safeVendas.map(v => {
      if (v.clienteId === modalPagamento.id && !v.pago) {
        return { 
          ...v, 
          pago: true, 
          formaPagamento: formaPagamento,
          data: new Date().toISOString() // Atualiza para a data do pagamento real
        };
      }
      return v;
    });
    setVendas(novasVendas);
    setModalPagamento(null);
    alert("Pagamento efetuado!");
  };

  const clientesComDivida = safeClientes.map(c => {
    const vendasAberto = safeVendas.filter(v => v.clienteId === c.id && !v.pago);
    const total = vendasAberto.reduce((acc, v) => acc + v.valor, 0);
    const dataInicio = vendasAberto.length > 0 ? vendasAberto[0].data : '-';
    return { ...c, total, dataInicio };
  }).filter(c => 
    c.total > 0 && (
      c.nome.toLowerCase().includes(busca.toLowerCase()) || 
      c.codigo.toString().includes(busca) ||
      c.empresa.toLowerCase().includes(busca.toLowerCase())
    )
  );

  const totalGeral = clientesComDivida.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Extrato e Pagamentos</h2>
      
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
        <label className="block text-sm font-bold text-indigo-800 mb-2">🔍 Filtrar Contas</label>
        <div className="relative">
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-indigo-200 rounded-lg outline-none focus:border-indigo-500 bg-white text-lg font-medium"
            placeholder="Nome, Empresa ou Código..."
          />
          <Search className="absolute left-3 top-3.5 text-indigo-400" size={20} />
        </div>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cód.</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cliente / Empresa</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Desde</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Total Devido</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientesComDivida.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-sm font-medium text-gray-500">{c.codigo}</td>
                <td className="p-4">
                  <div className="font-bold text-gray-900">{c.nome}</div>
                  <div className="text-xs text-gray-500">{c.empresa}</div>
                </td>
                <td className="p-4">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                    {c.dataInicio}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-red-600 font-black">R$ {Number(c.total || 0).toFixed(2)}</span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button 
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Detalhes"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => setModalPagamento({ id: c.id, nome: c.nome, valor: c.total })}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Pagar"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button 
                      className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                      title="WhatsApp"
                    >
                      <Phone size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clientesComDivida.length === 0 && (
              <tr>
                <td colSpan={5} className="p-20 text-center text-gray-400 italic">Nenhuma conta pendente encontrada</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="bg-white border-2 border-red-100 p-6 rounded-2xl shadow-sm text-right">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total na Rua</h3>
          <p className="text-4xl font-black text-red-600">R$ {Number(totalGeral || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-green-600 mb-6 text-center">Receber Pagamento</h2>
            
            <div className="space-y-2 mb-8 text-center">
              <p className="text-gray-500 font-medium">Cliente: <strong className="text-gray-900">{modalPagamento.nome}</strong></p>
              <p className="text-3xl font-black text-red-600">R$ {Number(modalPagamento.valor || 0).toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Como o cliente está pagando?</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full p-4 border-2 border-green-200 rounded-xl outline-none focus:border-green-500 font-bold text-lg"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão (Débito/Crédito)</option>
                </select>
              </div>

              <button 
                onClick={handlePagar}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg transition-all text-lg"
              >
                ✅ Confirmar Recebimento
              </button>
              
              <button 
                onClick={() => setModalPagamento(null)}
                className="w-full text-gray-400 font-bold hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
