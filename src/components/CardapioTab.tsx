import React, { useState } from 'react';
import { Produto, Categoria } from '../types';
import { Search, Pencil, Plus, Trash2, X, Tag } from 'lucide-react';

interface CardapioTabProps {
  produtos: Produto[];
  setProdutos: (produtos: Produto[]) => void;
  categorias: Categoria[];
  setCategorias: (categorias: Categoria[]) => void;
}

export default function CardapioTab({ produtos, setProdutos, categorias, setCategorias }: CardapioTabProps) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [tempo, setTempo] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ncm, setNcm] = useState('');
  const [cfop, setCfop] = useState('');
  const [busca, setBusca] = useState('');
  
  const [novaCategoria, setNovaCategoria] = useState('');
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  const safeProdutos = Array.isArray(produtos) ? produtos.filter(p => p && typeof p === 'object' && p.id) : [];
  const safeCategorias = Array.isArray(categorias) ? categorias : [];

  const handleAdd = () => {
    if (!nome || !preco) return;
    const novo: Produto = {
      id: Date.now(),
      nome,
      preco: parseFloat(preco),
      tempo: parseInt(tempo) || 15,
      imagem,
      categoria: categoria || undefined,
      descricao: descricao || undefined,
      ncm: ncm || undefined,
      cfop: cfop || undefined
    };
    setProdutos([...safeProdutos, novo]);
    setNome(''); setPreco(''); setTempo(''); setImagem(null); setCategoria(''); setDescricao(''); setNcm(''); setCfop('');
  };

  const handleUpdate = () => {
    if (!editingProduto) return;
    const updated = safeProdutos.map(p => p.id === editingProduto.id ? editingProduto : p);
    setProdutos(updated);
    setEditingProduto(null);
  };

  const handleAddCategoria = () => {
    if (!novaCategoria) return;
    const nova: Categoria = {
      id: Date.now().toString(),
      nome: novaCategoria
    };
    setCategorias([...safeCategorias, nova]);
    setNovaCategoria('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (isEdit && editingProduto) {
          setEditingProduto({ ...editingProduto, imagem: result });
        } else {
          setImagem(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProdutos = safeProdutos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(busca.toLowerCase()))
  );

  const groupedProdutos = safeCategorias.reduce((acc, cat) => {
    acc[cat.nome] = filteredProdutos.filter(p => p.categoria === cat.nome);
    return acc;
  }, { 'Sem Categoria': filteredProdutos.filter(p => !p.categoria) } as Record<string, Produto[]>);

  return (
    <div className="space-y-8">
      {/* Search and Category Management */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            Pesquisar no Cardápio
          </h2>
          <div className="relative">
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="w-full md:w-80">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Tag size={20} className="text-purple-600" />
            Categorias
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Nova categoria..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
            />
            <button 
              onClick={handleAddCategoria}
              className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {safeCategorias.map(cat => (
              <span key={cat.id} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                {cat.nome}
                <button onClick={() => setCategorias(safeCategorias.filter(c => c.id !== cat.id))}>
                  <X size={12} className="hover:text-red-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Add Product Form */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Novo Produto</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Nome do Prato/Bebida</label>
            <input 
              type="text" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Preço (R$)</label>
            <input 
              type="number" 
              value={preco} 
              onChange={(e) => setPreco(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Categoria</label>
            <select 
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Nenhuma</option>
              {safeCategorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Tempo (Min)</label>
            <input 
              type="number" 
              value={tempo} 
              onChange={(e) => setTempo(e.target.value)}
              placeholder="Ex: 15"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Foto (Opcional)</label>
            <input 
              type="file" 
              onChange={(e) => handleFileChange(e)}
              className="w-full px-4 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Descrição (Ingredientes, detalhes...)</label>
            <textarea 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Pão brioche, blend 180g, queijo cheddar..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-[42px]"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">NCM</label>
            <input 
              type="text" 
              value={ncm} 
              onChange={(e) => setNcm(e.target.value)}
              placeholder="Ex: 2106.90.90"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">CFOP</label>
            <input 
              type="text" 
              value={cfop} 
              onChange={(e) => setCfop(e.target.value)}
              placeholder="Ex: 5102"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <button 
              onClick={handleAdd}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-100"
            >
              Adicionar
            </button>
          </div>
        </div>
      </section>

      {/* Product List Grouped by Category */}
      <div className="space-y-10">
        {Object.entries(groupedProdutos).map(([catName, prods]) => (
          prods.length > 0 && (
            <div key={catName}>
              <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
                {catName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prods.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      {p.imagem ? (
                        <img src={p.imagem} alt={p.nome} referrerPolicy="no-referrer" className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">🍔</div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800">{p.nome}</h3>
                        {p.descricao && <p className="text-[10px] text-gray-500 line-clamp-1 mb-1">{p.descricao}</p>}
                        <p className="text-sm text-blue-600 font-black">R$ {Number(p.preco || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">⏱️ {p.tempo} min</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingProduto(p)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => setProdutos(safeProdutos.filter(x => x.id !== p.id))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
        {filteredProdutos.length === 0 && (
          <div className="py-20 text-center text-gray-400 italic">Nenhum produto encontrado.</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProduto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">Editar Produto</h2>
              <button onClick={() => setEditingProduto(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Nome</label>
                <input 
                  type="text" 
                  value={editingProduto.nome}
                  onChange={(e) => setEditingProduto({ ...editingProduto, nome: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    value={editingProduto.preco}
                    onChange={(e) => setEditingProduto({ ...editingProduto, preco: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Tempo (Min)</label>
                  <input 
                    type="number" 
                    value={editingProduto.tempo}
                    onChange={(e) => setEditingProduto({ ...editingProduto, tempo: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">NCM</label>
                  <input 
                    type="text" 
                    value={editingProduto.ncm || ''}
                    onChange={(e) => setEditingProduto({ ...editingProduto, ncm: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">CFOP</label>
                  <input 
                    type="text" 
                    value={editingProduto.cfop || ''}
                    onChange={(e) => setEditingProduto({ ...editingProduto, cfop: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Categoria</label>
                <select 
                  value={editingProduto.categoria || ''}
                  onChange={(e) => setEditingProduto({ ...editingProduto, categoria: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Nenhuma</option>
                  {safeCategorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Descrição</label>
                <textarea 
                  value={editingProduto.descricao || ''}
                  onChange={(e) => setEditingProduto({ ...editingProduto, descricao: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none h-24"
                  placeholder="Detalhes do produto..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Foto</label>
                <input 
                  type="file" 
                  onChange={(e) => handleFileChange(e, true)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all"
                >
                  Salvar Alterações
                </button>
                <button 
                  onClick={() => setEditingProduto(null)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-4 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
