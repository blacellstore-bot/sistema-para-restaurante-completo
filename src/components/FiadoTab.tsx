import React, { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Cliente, Produto, Venda, PedidoOnline, ItemPedido } from '../types';

interface FiadoTabProps {
  clientes: Cliente[];
  produtos: Produto[];
  vendas: Venda[];
  setVendas: (vendas: Venda[]) => void;
  pedidosOnline: PedidoOnline[];
  setPedidosOnline: (pedido: PedidoOnline) => void;
}

export default function FiadoTab({ 
  clientes, produtos, vendas, setVendas, pedidosOnline, setPedidosOnline 
}: FiadoTabProps) {
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [descItem, setDescItem] = useState('');
  const [valorItem, setValorItem] = useState('');
  const [qtdItem, setQtdItem] = useState(1);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const safeClientes = Array.isArray(clientes) ? clientes.filter(c => c && typeof c === 'object' && c.id) : [];
  const safeProdutos = Array.isArray(produtos) ? produtos.filter(p => p && typeof p === 'object' && p.id) : [];
  const safeVendas = Array.isArray(vendas) ? vendas.filter(v => v && typeof v === 'object' && v.id) : [];

  const sugestoes = safeClientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.codigo.toString().includes(busca)
  ).slice(0, 5);

  const handleSelectCliente = (c: Cliente) => {
    setClienteSelecionado(c);
    setBusca('');
    setShowSugestoes(false);
  };

  const handleAddAoCarrinho = () => {
    if (!descItem || !valorItem) return;
    const prodDb = safeProdutos.find(p => p.nome === descItem);
    const tempo = prodDb?.tempo || 15;
    const preco = parseFloat(valorItem);
    
    setCarrinho([...carrinho, {
      nome: descItem,
      desc: descItem,
      preco: preco,
      valorUnit: preco,
      qtd: qtdItem,
      total: preco * qtdItem,
      tempo: tempo
    }]);
    
    setDescItem('');
    setValorItem('');
    setQtdItem(1);
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.total, 0);

  const finalizarPedido = () => {
    if (!clienteSelecionado || carrinho.length === 0) return;

    const novasVendas: Venda[] = carrinho.map(item => ({
      id: Date.now() + Math.random(),
      clienteId: clienteSelecionado.id,
      desc: `${item.qtd}x ${item.nome}`,
      valor: item.total,
      data: new Date().toLocaleDateString(),
      pago: false,
      formaPagamento: 'Fiado'
    }));

    setVendas([...safeVendas, ...novasVendas]);

    const maxTempo = Math.max(...carrinho.map(i => i.tempo), 15);
    const agora = new Date();
    
    const novoPedido: PedidoOnline = {
      id: Date.now(),
      timestamp: Date.now(),
      tempoPreparo: maxTempo,
      codigoComanda: Math.floor(1000 + Math.random() * 9000),
      hora: agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      identificacao: clienteSelecionado.nome,
      itens: carrinho.map(i => ({ nome: i.nome, preco: i.preco, qtd: i.qtd, tempo: i.tempo })),
      total: totalCarrinho,
      status: 'Pendente',
      origem: 'Fiado',
      formaPagamento: 'Fiado'
    };

    setPedidosOnline(novoPedido);
    setCarrinho([]);
    setClienteSelecionado(null);
    alert("Fiado Lançado e Enviado à Cozinha!");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Lançar na Conta (Fiado Mensal)</h2>
      
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 relative">
        <label className="block text-sm font-bold text-blue-800 mb-2">Buscar Cliente Cadastrado</label>
        <div className="relative">
          <input 
            type="text" 
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setShowSugestoes(true); }}
            onFocus={() => setShowSugestoes(true)}
            className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Nome, Código ou Empresa..."
          />
          <Search className="absolute left-3 top-3.5 text-blue-400" size={20} />
        </div>

        {showSugestoes && busca && (
          <div className="absolute left-6 right-6 top-full mt-1 bg-white border border-blue-200 rounded-lg shadow-xl z-10 overflow-hidden">
            {sugestoes.length > 0 ? sugestoes.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleSelectCliente(c)}
                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
              >
                <div className="font-bold text-gray-800">{c.nome}</div>
                <div className="text-xs text-gray-500">(Cód: {c.codigo}) - {c.empresa}</div>
              </div>
            )) : (
              <div className="p-3 text-gray-400 text-sm italic">Nenhum cliente encontrado</div>
            )}
          </div>
        )}
      </div>

      {clienteSelecionado && (
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center justify-between">
          <div>
            <span className="text-green-800 font-bold">{clienteSelecionado.nome}</span>
            <span className="text-green-600 text-sm ml-2">({clienteSelecionado.empresa})</span>
          </div>
          <button 
            onClick={() => setClienteSelecionado(null)}
            className="text-xs font-bold text-green-700 underline"
          >
            Trocar
          </button>
        </div>
      )}

      {clienteSelecionado && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-500 mb-2">Cardápio Rápido</label>
            <select 
              onChange={(e) => {
                const p = safeProdutos.find(x => x.nome === e.target.value);
                if (p) {
                  setDescItem(p.nome);
                  setValorItem(p.preco.toString());
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">-- Selecione um item do cardápio --</option>
              {safeProdutos.map(p => <option key={p.id} value={p.nome}>{p.nome} - R$ {Number(p.preco || 0).toFixed(2)}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                value={descItem}
                onChange={(e) => setDescItem(e.target.value)}
                placeholder="Descrição"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="w-32">
              <input 
                type="number" 
                value={valorItem}
                onChange={(e) => setValorItem(e.target.value)}
                placeholder="R$"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="w-20">
              <input 
                type="number" 
                value={qtdItem}
                onChange={(e) => setQtdItem(parseInt(e.target.value))}
                min="1"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <button 
              onClick={handleAddAoCarrinho}
              className="bg-amber-500 text-white p-3.5 rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-sm font-bold text-gray-600">Item</th>
                  <th className="p-3 text-sm font-bold text-gray-600">Qtd</th>
                  <th className="p-3 text-sm font-bold text-gray-600">Total</th>
                  <th className="p-3 text-sm font-bold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {carrinho.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-3 text-sm">{item.nome}</td>
                    <td className="p-3 text-sm">{item.qtd}</td>
                    <td className="p-3 text-sm font-bold">R$ {Number(item.total || 0).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => setCarrinho(carrinho.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {carrinho.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhum item adicionado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-4">
            <h3 className="text-2xl font-black text-red-600">Total: R$ {Number(totalCarrinho || 0).toFixed(2)}</h3>
            <button 
              onClick={finalizarPedido}
              disabled={carrinho.length === 0}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black px-10 py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Salvar Dívida e Enviar para Cozinha 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
