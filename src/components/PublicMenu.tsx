import React, { useState, useEffect } from 'react';
import { Produto, Categoria, SiteConfig } from '../types';
import { dataService } from '../services/dataService';
import { ShoppingBag, Plus, Minus, X, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PublicMenuProps {
  tenantId: string;
  mesa?: string;
}

export default function PublicMenu({ tenantId, mesa }: PublicMenuProps) {
  const [data, setData] = useState<{
    restaurante: string;
    config: SiteConfig;
    produtos: Produto[];
    categorias: Categoria[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ produto: Produto; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  useEffect(() => {
    dataService.getPublicMenu(tenantId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      if (existing) {
        return prev.map(item => item.produto.id === produto.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { produto, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.produto.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const total = cart.reduce((acc, item) => acc + (item.produto.preco * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!customerName) return alert('Por favor, informe seu nome.');
    if (cart.length === 0) return;

    setOrderStatus('sending');
    const pedido = {
      timestamp: Date.now(),
      tempoPreparo: Math.max(...cart.map(i => i.produto.tempo || 0)),
      codigoComanda: Math.floor(1000 + Math.random() * 9000),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      identificacao: `${mesa ? `Mesa ${mesa}` : 'Balcão'} - ${customerName}`,
      itens: cart.map(i => ({
        id: i.produto.id,
        nome: i.produto.nome,
        preco: i.produto.preco,
        quantidade: i.quantity,
        categoria: i.produto.categoria,
        ncm: i.produto.ncm,
        cfop: i.produto.cfop
      })),
      total,
      status: 'Pendente',
      origem: 'QR Code',
      formaPagamento: 'A definir'
    };

    try {
      await dataService.savePublicPedido(tenantId, pedido);
      setOrderStatus('success');
      setCart([]);
      setShowCart(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar pedido. Tente novamente.');
      setOrderStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Ops!</h1>
        <p className="text-gray-500 font-bold">Não conseguimos encontrar este cardápio.</p>
      </div>
    );
  }

  const { config, produtos, categorias, restaurante } = data;

  const displayName = config.customName || restaurante;

  const sortedCategorias = config.autoCategoryOrder 
    ? categorias 
    : [...categorias].sort((a, b) => {
        const order = config.categoryOrder || [];
        const indexA = order.indexOf(a.nome);
        const indexB = order.indexOf(b.nome);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('vimeo.com/')) {
      videoId = url.split('vimeo.com/')[1].split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const videoEmbedUrl = getEmbedUrl(config.videoUrl || '');

  return (
    <div className="min-h-screen pb-32 transition-colors duration-500" style={{ backgroundColor: config.backgroundColor || '#f9fafb' }}>
      {/* Header / Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden" style={{ backgroundColor: config.primaryColor || '#2563eb' }}>
        {config.banner ? (
          <img src={config.banner} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {config.showLogo && (
          <div className="absolute -bottom-4 left-6 flex items-end gap-4">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-2xl border-4 border-white overflow-hidden">
              {config.logo ? (
                <img src={config.logo} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-full" alt="Logo" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl">🍽️</div>
              )}
            </div>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-md">
                {displayName}
              </h1>
              {mesa && (
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                  Mesa {mesa}
                </span>
              )}
            </div>
          </div>
        )}

        {!config.showLogo && (
          <div className="absolute bottom-6 left-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md">
              {displayName}
            </h1>
            {mesa && (
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                Mesa {mesa}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-16 px-6 space-y-8">
        {config.description && (
          <div className="bg-white p-6 rounded-3xl border shadow-sm" style={{ borderColor: `${config.primaryColor}20` }}>
            <p className="text-sm text-gray-600 font-medium leading-relaxed italic">
              "{config.description}"
            </p>
          </div>
        )}

        {videoEmbedUrl && (
          <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-lg border-4" style={{ borderColor: config.primaryColor || '#2563eb' }}>
            <iframe 
              src={videoEmbedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {config.useDigitalMenu ? (
          <div className="space-y-12">
            {/* Categories */}
            {sortedCategorias.map(cat => {
              const catProds = produtos.filter(p => p.categoria === cat.nome);
              if (catProds.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-6">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-10 h-1.5 rounded-full" style={{ backgroundColor: config.primaryColor || '#2563eb' }}></span>
                    {cat.nome}
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {catProds.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4 group active:scale-[0.98] transition-all" style={{ borderColor: `${config.primaryColor}10` }}>
                        {p.imagem ? (
                          <img src={p.imagem} referrerPolicy="no-referrer" className="w-24 h-24 rounded-2xl object-cover" alt={p.nome} />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl">🍔</div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 text-lg">{p.nome}</h3>
                          {p.descricao && <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-tight font-medium">{p.descricao}</p>}
                          <p className="font-black text-lg" style={{ color: config.primaryColor || '#2563eb' }}>R$ {Number(p.preco).toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => addToCart(p)}
                          className="text-white p-4 rounded-2xl shadow-lg transition-transform active:scale-90"
                          style={{ backgroundColor: config.primaryColor || '#2563eb' }}
                        >
                          <Plus size={24} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized */}
            {produtos.filter(p => !p.categoria).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-8 h-1 bg-gray-400 rounded-full"></span>
                  Outros
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {produtos.filter(p => !p.categoria).map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                      {p.imagem ? (
                        <img src={p.imagem} referrerPolicy="no-referrer" className="w-20 h-20 rounded-xl object-cover" alt={p.nome} />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-50 flex items-center justify-center text-3xl">🍔</div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{p.nome}</h3>
                        {p.descricao && <p className="text-[10px] text-gray-500 line-clamp-2 mb-1 leading-tight">{p.descricao}</p>}
                        <p className="text-blue-600 font-black text-sm">R$ {Number(p.preco).toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(p)}
                        className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-100 active:bg-blue-700"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {config.menuImages.map((img, idx) => (
              <img key={idx} src={img} referrerPolicy="no-referrer" className="w-full rounded-2xl shadow-lg border border-gray-100" alt={`Menu Page ${idx + 1}`} />
            ))}
            {config.menuImages.length === 0 && (
              <div className="py-20 text-center text-gray-400 italic">O cardápio ainda não foi configurado.</div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-40">
          <button 
            onClick={() => setShowCart(true)}
            className="w-full text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between animate-bounce-subtle"
            style={{ backgroundColor: config.primaryColor || '#2563eb' }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <ShoppingBag size={24} />
              </div>
              <span className="font-black uppercase tracking-widest text-sm">Ver Pedido ({cart.length})</span>
            </div>
            <span className="font-black text-xl">R$ {Number(total || 0).toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Seu Pedido</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map(item => (
                  <div key={item.produto.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.produto.nome}</h4>
                      <p className="text-xs text-blue-600 font-black">R$ {(Number(item.produto.preco || 0) * Number(item.quantity || 0)).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button 
                        onClick={() => updateQuantity(item.produto.id, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.produto.id, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-400 hover:text-blue-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Seu Nome</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Como devemos te chamar?"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                    />
                  </div>
                  {mesa && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Info size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pedido para a Mesa {mesa}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 font-bold">Total</span>
                  <span className="text-2xl font-black text-gray-900">R$ {Number(total || 0).toFixed(2)}</span>
                </div>
                <button 
                  onClick={handlePlaceOrder}
                  disabled={orderStatus === 'sending'}
                  className="w-full text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl disabled:opacity-50 transition-all active:scale-95"
                  style={{ backgroundColor: config.primaryColor || '#2563eb' }}
                >
                  {orderStatus === 'sending' ? 'Enviando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {orderStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-center text-white"
            style={{ backgroundColor: config.primaryColor || '#2563eb' }}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md">
                <CheckCircle2 size={48} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Pedido Enviado!</h2>
                <p className="text-blue-100 font-bold mt-2">Já estamos preparando seu pedido na cozinha.</p>
              </div>
              <button 
                onClick={() => setOrderStatus('idle')}
                className="bg-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl"
                style={{ color: config.primaryColor || '#2563eb' }}
              >
                Fazer outro pedido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
