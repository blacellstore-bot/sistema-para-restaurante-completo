import React, { useState } from 'react';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Produto, PedidoOnline, ItemPedido } from '../types';

interface PDVTabProps {
  produtos: Produto[];
  pedidosOnline: PedidoOnline[];
  setPedidosOnline: (pedido: PedidoOnline) => void;
}

export default function PDVTab({ produtos, pedidosOnline, setPedidosOnline }: PDVTabProps) {
  const [nomeMesa, setNomeMesa] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [carrinho, setCarrinho] = useState<ItemPedido[]>([]);

  const safeProdutos = Array.isArray(produtos) ? produtos.filter(p => p && typeof p === 'object' && p.id) : [];

  const handleAddAoCarrinho = (p: Produto) => {
    const existing = carrinho.find(i => i.nome === p.nome);
    if (existing) {
      setCarrinho(carrinho.map(i => 
        i.nome === p.nome ? { ...i, qtd: i.qtd + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, {
        nome: p.nome,
        preco: p.preco,
        qtd: 1,
        tempo: p.tempo || 15,
        ncm: p.ncm,
        cfop: p.cfop
      }]);
    }
  };

  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  const finalizarPedido = () => {
    if (carrinho.length === 0) return;
    if (!nomeMesa) {
      alert("Digite a Mesa ou o Nome!");
      return;
    }

    const maxTempo = Math.max(...carrinho.map(i => i.tempo), 15);
    const agora = new Date();
    
    const novoPedido: PedidoOnline = {
      id: Date.now(),
      timestamp: Date.now(),
      tempoPreparo: maxTempo,
      codigoComanda: Math.floor(1000 + Math.random() * 9000),
      hora: agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      identificacao: nomeMesa,
      itens: JSON.parse(JSON.stringify(carrinho)),
      total: total,
      status: 'Pendente',
      origem: 'Balcao',
      formaPagamento: formaPagamento
    };

    setPedidosOnline(novoPedido);
    setCarrinho([]);
    setNomeMesa('');
    alert("🚀 Recebido & Enviado p/ Cozinha");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-teal-700 mb-1">Identificação do Cliente / Mesa</label>
            <input 
              type="text" 
              value={nomeMesa}
              onChange={(e) => setNomeMesa(e.target.value)}
              placeholder="Ex: Mesa 04 ou Nome do Cliente..."
              className="w-full p-3 border-2 border-teal-200 rounded-lg outline-none focus:border-teal-500 font-bold text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-teal-700 mb-1">Forma de Pagamento</label>
            <select 
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full p-3 border-2 border-teal-200 rounded-lg outline-none focus:border-teal-500 font-bold"
            >
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão (Débito/Crédito)</option>
            </select>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-100 pb-2">Cardápio (Clique para adicionar)</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          {safeProdutos.map((p) => (
            <button 
              key={p.id}
              onClick={() => handleAddAoCarrinho(p)}
              className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-teal-500 hover:bg-teal-50 transition-all shadow-sm group"
            >
              {p.imagem ? (
                <img src={p.imagem} alt={p.nome} className="w-full h-24 object-cover rounded-lg mb-2" />
              ) : (
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">🍔</div>
              )}
              <div className="font-bold text-sm text-gray-800 line-clamp-2 h-10 mb-1">{p.nome || 'Sem Nome'}</div>
              {p.descricao && <div className="text-[9px] text-gray-400 line-clamp-1 mb-1">{p.descricao}</div>}
              <div className="text-teal-600 font-black">R$ {Number(p.preco || 0).toFixed(2)}</div>
            </button>
          ))}
          {safeProdutos.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400">Cadastre produtos primeiro.</div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-200 pb-4">
          <ShoppingCart className="text-slate-600" />
          <h3 className="text-xl font-black text-slate-800">Comanda Atual</h3>
        </div>

        <div className="flex-grow overflow-y-auto space-y-3 mb-6">
          {carrinho.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-sm">{item.qtd || 0}x</span>
                <span className="font-medium text-slate-800">{item.nome || 'Item'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">R$ {(Number(item.preco || 0) * Number(item.qtd || 0)).toFixed(2)}</span>
                <button 
                  onClick={() => setCarrinho(carrinho.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {carrinho.length === 0 && (
            <div className="text-center py-20 text-slate-400 italic">Nenhum item adicionado.</div>
          )}
        </div>

        <div className="border-t-2 border-slate-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-red-600">R$ {Number(total || 0).toFixed(2)}</span>
          </div>
          
          <button 
            onClick={finalizarPedido}
            disabled={carrinho.length === 0}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            🚀 Receber & Enviar p/ Cozinha
          </button>
          
          <button 
            onClick={() => setCarrinho([])}
            className="w-full mt-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            🗑️ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
