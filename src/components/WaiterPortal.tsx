
import React, { useState, useEffect } from 'react';
import { 
  LogOut, ShoppingBag, MapPin, Clock, CheckCircle2, 
  Utensils, Search, Plus, Minus, QrCode, Wallet, 
  ChevronRight, AlertCircle, Loader2, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { dataService } from '../services/dataService';
import { Produto, Categoria, PedidoOnline, User } from '../types';
import { cn } from '../lib/utils';

interface WaiterPortalProps {
  menuCode: string;
}

export default function WaiterPortal({ menuCode }: WaiterPortalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [waiterUser, setWaiterUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  
  const [activeView, setActiveView] = useState<'menu' | 'orders' | 'payment' | 'commissions'>('menu');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cart, setCart] = useState<{produto: Produto, qtd: number}[]>([]);
  const [scanning, setScanning] = useState<'order' | 'payment' | null>(null);
  const [scannedMesa, setScannedMesa] = useState('');
  const [mesaPedidos, setMesaPedidos] = useState<PedidoOnline[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeOrders, setActiveOrders] = useState<PedidoOnline[]>([]);

  const getSafeItens = (ped: any) => {
    if (!ped || !ped.itens) return [];
    if (Array.isArray(ped.itens)) return ped.itens;
    if (typeof ped.itens === 'string') {
      try {
        return JSON.parse(ped.itens);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Load tenant info
  useEffect(() => {
    const loadTenant = async () => {
      try {
        const t = await dataService.getTenantByCode(menuCode);
        setTenant(t);
        dataService.setTenantId(t.id);
      } catch (err) {
        setError('Empresa não encontrada ou código inválido.');
      }
    };
    loadTenant();
  }, [menuCode]);

  // Check local storage for existing session
  useEffect(() => {
    const stored = localStorage.getItem(`waiter_session_${menuCode}`);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user && user.id) {
          setWaiterUser(user);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.error('Erro ao carregar sessão do garçom:', e);
        localStorage.removeItem(`waiter_session_${menuCode}`);
      }
    }
  }, [menuCode]);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn && tenant) {
      const loadData = async () => {
        try {
          const [p, c] = await Promise.all([
            dataService.getProdutos(),
            dataService.getCategorias()
          ]);
          setProdutos(Array.isArray(p) ? p : []);
          setCategorias(Array.isArray(c) ? c : []);
          
          if (waiterUser) {
            const [comm, orders] = await Promise.all([
              dataService.getWaiterCommissions(waiterUser.id),
              dataService.getPedidos()
            ]);
            setTotalCommission(comm?.total || 0);
            setTotalSales(comm?.totalSales || 0);
            const safeOrders = Array.isArray(orders) ? orders : [];
            setActiveOrders(safeOrders.filter((p: PedidoOnline) => p.waiterId === waiterUser.id && p.status !== 'Concluido' && p.status !== 'Cancelado'));
          }
        } catch (err) {
          console.error('Erro ao carregar dados do garçom:', err);
        }
      };
      loadData();
    }
  }, [isLoggedIn, tenant, waiterUser]);

  // Polling for new orders
  useEffect(() => {
    if (!isLoggedIn || !waiterUser || !tenant) return;
    
    const pollOrders = async () => {
      try {
        const [orders, comm] = await Promise.all([
          dataService.getPedidos(),
          dataService.getWaiterCommissions(waiterUser.id)
        ]);
        
        const safeOrders = Array.isArray(orders) ? orders : [];
        setActiveOrders(safeOrders.filter((p: PedidoOnline) => p.waiterId === waiterUser.id && p.status !== 'Concluido' && p.status !== 'Cancelado'));
        setTotalCommission(comm?.total || 0);
        setTotalSales(comm?.totalSales || 0);
      } catch (e) {
        console.error('Erro no polling do garçom:', e);
      }
    };

    const interval = setInterval(pollOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [isLoggedIn, waiterUser, tenant]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await dataService.waiterLogin(username, password, menuCode);
      setWaiterUser(user);
      setIsLoggedIn(true);
      localStorage.setItem(`waiter_session_${menuCode}`, JSON.stringify(user));
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setWaiterUser(null);
    localStorage.removeItem(`waiter_session_${menuCode}`);
  };

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      if (existing) {
        return prev.map(item => item.produto.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item);
      }
      return [...prev, { produto, qtd: 1 }];
    });
  };

  const removeFromCart = (produtoId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produtoId);
      if (existing && existing.qtd > 1) {
        return prev.map(item => item.produto.id === produtoId ? { ...item, qtd: item.qtd - 1 } : item);
      }
      return prev.filter(item => item.produto.id !== produtoId);
    });
  };

  // QR Scanner Effect
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (scanning) {
      const timer = setTimeout(() => {
        try {
          const element = document.getElementById("reader");
          if (!element) return;

          scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
          scanner.render((decodedText) => {
            // Extract mesa from URL if it's a link
            let mesa = decodedText;
            if (decodedText.includes('/menu/')) {
              const parts = decodedText.split('/');
              mesa = decodeURIComponent(parts[parts.length - 1]);
            }
            
            setScannedMesa(mesa);
            if (scanning === 'payment') {
              loadMesaPedidos(mesa);
            }
            
            if (scanner) {
              scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            }
            setScanning(null);
          }, (err) => {
            // Silent error for scanning
          });
        } catch (err) {
          console.error("Erro ao inicializar scanner:", err);
          setScanning(null);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [scanning]);

  const loadMesaPedidos = async (mesa: string) => {
    setLoading(true);
    setError('');
    try {
      const pedidos = await dataService.getPedidosMesa(mesa);
      const safePedidos = Array.isArray(pedidos) ? pedidos : [];
      setMesaPedidos(safePedidos);
      if (safePedidos.length === 0) {
        setError('Nenhum pedido em aberto encontrado para esta mesa.');
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos da mesa:', err);
      setError('Erro ao carregar pedidos da mesa.');
    } finally {
      setLoading(false);
    }
  };

  const submitOrder = async () => {
    if (!scannedMesa) {
      setScanning('order');
      return;
    }

    setLoading(true);
    try {
      const total = cart.reduce((sum, item) => sum + (Number(item.produto.preco) * item.qtd), 0);
      const commissionRate = waiterUser?.waiterConfig?.commissionRate || 10;
      const commissionValue = (total * commissionRate) / 100;

      const novoPedido = {
        timestamp: Date.now(),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        identificacao: scannedMesa,
        itens: cart.map(item => ({
          nome: item.produto.nome,
          qtd: item.qtd,
          preco: item.produto.preco,
          ncm: item.produto.ncm,
          cfop: item.produto.cfop
        })),
        total,
        status: 'Pendente',
        origem: 'Garçom',
        waiterId: waiterUser?.id,
        commissionValue
      };

      await dataService.savePedido(novoPedido);
      setCart([]);
      setScannedMesa('');
      setActiveView('orders');
      
      // Refresh active orders
      const orders = await dataService.getPedidos();
      const safeOrders = Array.isArray(orders) ? orders : [];
      setActiveOrders(safeOrders.filter((p: PedidoOnline) => p.waiterId === waiterUser?.id && p.status !== 'Concluido' && p.status !== 'Cancelado'));
      
      alert('Pedido enviado com sucesso!');
    } catch (err) {
      alert('Erro ao enviar pedido');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (forma: string) => {
    if (!scannedMesa) return;

    const pendingOrders = mesaPedidos.filter(p => p.status !== 'Pronto');
    if (pendingOrders.length > 0) {
      alert('⚠️ Atenção: Existem pedidos que ainda não estão prontos na cozinha. O pagamento só pode ser confirmado após todos os pedidos estarem prontos!');
      return;
    }

    setLoading(true);
    try {
      await dataService.pagarMesa(scannedMesa, forma);
      setMesaPedidos([]);
      setScannedMesa('');
      
      // Update commissions and active orders
      if (waiterUser) {
        const [comm, orders] = await Promise.all([
          dataService.getWaiterCommissions(waiterUser.id),
          dataService.getPedidos()
        ]);
        setTotalCommission(comm?.total || 0);
        const safeOrders = Array.isArray(orders) ? orders : [];
        setActiveOrders(safeOrders.filter((p: PedidoOnline) => p.waiterId === waiterUser.id && p.status !== 'Concluido' && p.status !== 'Cancelado'));
      }
      
      alert('Pagamento confirmado e mesa liberada!');
    } catch (err) {
      alert('Erro ao confirmar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-white font-bold">Carregando portal do garçom...</p>
          {error && <p className="text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="bg-purple-600 p-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md rotate-12">
              <Utensils size={40} className="-rotate-12" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
              Portal do Garçom
            </h2>
            <p className="text-purple-100 font-bold text-sm uppercase tracking-widest opacity-80">
              {tenant.name}
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100 animate-shake">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:border-purple-500 focus:bg-white outline-none transition-all"
                  placeholder="Seu usuário"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:border-purple-500 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black py-5 rounded-3xl shadow-xl shadow-purple-200 transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>ENTRAR NO SISTEMA</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-purple-600 p-6 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl backdrop-blur-sm">
              {waiterUser?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-black text-lg leading-none">{waiterUser?.name || 'Garçom'}</div>
              <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mt-1">
                {tenant?.name || 'Empresa'}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full pb-32">
        <AnimatePresence mode="wait">
          {activeView === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Cardápio</h3>
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-2xl font-black text-sm">
                  {cart.reduce((sum, i) => sum + i.qtd, 0)} Itens
                </div>
              </div>

              {/* Search & Categories */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar prato ou bebida..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-gray-900 focus:border-purple-500 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all",
                      selectedCategory === 'all' ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-white text-gray-500 border-2 border-gray-100"
                    )}
                  >
                    Todos
                  </button>
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.nome)}
                      className={cn(
                        "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all",
                        selectedCategory === cat.nome ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-white text-gray-500 border-2 border-gray-100"
                      )}
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid gap-4">
                {filteredProdutos.map(produto => {
                  const cartItem = cart.find(i => i.produto.id === produto.id);
                  return (
                    <div key={produto.id} className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 flex gap-4 items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0">
                        {produto.imagem ? (
                          <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Utensils size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 truncate">{produto.nome}</h4>
                        <p className="text-xs text-gray-500 font-bold mb-2">{produto.categoria}</p>
                        <div className="text-lg font-black text-purple-600">R$ {Number(produto.preco).toFixed(2)}</div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        {cartItem ? (
                          <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <button 
                              onClick={() => removeFromCart(produto.id)}
                              className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="font-black text-gray-900 w-4 text-center">{cartItem.qtd}</span>
                            <button 
                              onClick={() => addToCart(produto)}
                              className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(produto)}
                            className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-100 hover:scale-105 transition-transform"
                          >
                            <Plus size={24} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeView === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Receber / Cobrar</h3>
              
              {!scannedMesa ? (
                <div className="bg-white rounded-[2.5rem] p-10 text-center space-y-6 shadow-xl border border-gray-100">
                  <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                    <QrCode size={48} className="text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-900">Escanear Mesa</h4>
                    <p className="text-gray-500 font-bold text-sm">Escaneie o QR Code da mesa para ver a conta atual.</p>
                  </div>
                  <button 
                    onClick={() => setScanning('payment')}
                    className="w-full bg-purple-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-purple-200 flex items-center justify-center gap-3"
                  >
                    <QrCode size={24} />
                    ABRIR CÂMERA
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-gray-400"><span className="bg-white px-4">Ou digite manualmente</span></div>
                  </div>
                  <input 
                    type="text"
                    placeholder="Número da Mesa"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-center font-black text-2xl outline-none focus:border-purple-500 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          setScannedMesa(val);
                          loadMesaPedidos(val);
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesa Selecionada</div>
                        <div className="text-2xl font-black text-gray-900">{scannedMesa}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setScannedMesa(''); setMesaPedidos([]); }}
                      className="text-xs font-black text-purple-600 uppercase tracking-widest hover:underline"
                    >
                      Trocar Mesa
                    </button>
                  </div>

                  <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-50">
                      <h4 className="font-black text-gray-900 uppercase tracking-tight">Itens Consumidos</h4>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                      {mesaPedidos.map(ped => (
                        <div key={ped.id} className="p-4 space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido #{ped.id}</span>
                            <div className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              ped.status === 'Pronto' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                            )}>
                              {ped.status}
                            </div>
                          </div>
                          {getSafeItens(ped).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 font-bold">
                                <span className="text-purple-600 font-black mr-2">{it.qtd}x</span>
                                {it.nome}
                              </span>
                              <span className="font-black text-gray-900">R$ {(Number(it.preco || 0) * (it.qtd || 0)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {mesaPedidos.length === 0 && (
                        <div className="p-10 text-center text-gray-400 font-bold italic">Nenhum pedido ativo nesta mesa.</div>
                      )}
                    </div>
                    <div className="p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-black uppercase tracking-widest text-xs">Total da Conta</span>
                        <span className="text-3xl font-black text-gray-900">
                          R$ {mesaPedidos.reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}
                        </span>
                      </div>

                      {mesaPedidos.some(p => p.status !== 'Pronto') && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                          <Clock className="text-orange-500 shrink-0" size={20} />
                          <p className="text-xs text-orange-700 font-bold leading-relaxed">
                            Aguardando a cozinha finalizar todos os pedidos desta mesa para liberar o pagamento.
                          </p>
                        </div>
                      )}
                      
                      {mesaPedidos.length > 0 && (
                        <div className={cn(
                          "grid grid-cols-2 gap-3 transition-opacity",
                          mesaPedidos.some(p => p.status !== 'Pronto') ? "opacity-50 pointer-events-none grayscale" : ""
                        )}>
                          <button 
                            onClick={() => confirmPayment('Dinheiro')}
                            className="bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex flex-col items-center gap-1"
                          >
                            <DollarSign size={20} />
                            <span className="text-[10px] uppercase tracking-widest">Dinheiro</span>
                          </button>
                          <button 
                            onClick={() => confirmPayment('Cartão')}
                            className="bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 flex flex-col items-center gap-1"
                          >
                            <Wallet size={20} />
                            <span className="text-[10px] uppercase tracking-widest">Cartão</span>
                          </button>
                          <button 
                            onClick={() => confirmPayment('PIX')}
                            className="col-span-2 bg-teal-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
                          >
                            <QrCode size={20} />
                            <span className="text-[10px] uppercase tracking-widest">PIX</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'commissions' && (
            <motion.div 
              key="commissions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Minhas Comissões</h3>
              
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 space-y-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total em Vendas</div>
                    <div className="text-3xl font-black">R$ {Number(totalSales || 0).toFixed(2)}</div>
                  </div>
                  
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Comissão Acumulada</div>
                    <div className="text-5xl font-black">R$ {Number(totalCommission || 0).toFixed(2)}</div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-2 rounded-xl backdrop-blur-md">
                    <Clock size={16} />
                    <span className="text-xs font-bold">Atualizado em tempo real</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900">Sua Taxa de Serviço</h4>
                    <p className="text-xs text-gray-500 font-bold">{waiterUser?.waiterConfig?.commissionRate || 10}% sobre cada pedido concluído</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-400 text-xs font-bold italic px-10">
                As comissões são calculadas automaticamente assim que o pagamento da mesa é confirmado.
              </p>
            </motion.div>
          )}

          {activeView === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Meus Pedidos Ativos</h3>
              
              <div className="space-y-4">
                {activeOrders.map(ped => (
                  <div key={ped.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesa</div>
                          <div className="text-lg font-black text-gray-900">{ped.identificacao}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        ped.status === 'Pronto' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {ped.status}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {getSafeItens(ped).map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">{it.qtd}x {it.nome}</span>
                          <span className="text-gray-400">R$ {(Number(it.preco || 0) * (it.qtd || 0)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase">
                        <Clock size={12} /> {ped.hora}
                      </div>
                      <div className="font-black text-gray-900">Total: R$ {Number(ped.total).toFixed(2)}</div>
                    </div>
                  </div>
                ))}

                {activeOrders.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold italic">Você não tem pedidos ativos no momento.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* QR Scanner Modal */}
      {scanning && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-6 flex justify-between items-center text-white">
            <h3 className="font-black uppercase tracking-widest">Escanear QR Code</h3>
            <button onClick={() => setScanning(null)} className="p-2 bg-white/10 rounded-xl">
              <LogOut size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-purple-500 shadow-2xl shadow-purple-500/20"></div>
          </div>
          <div className="p-10 text-center text-white/60 text-xs font-bold uppercase tracking-widest">
            Aponte a câmera para o QR Code da mesa
          </div>
        </div>
      )}

      {/* Cart Summary (Floating) */}
      {cart.length > 0 && activeView === 'menu' && (
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-gray-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center font-black">
                {cart.reduce((sum, i) => sum + i.qtd, 0)}
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total do Pedido</div>
                <div className="text-xl font-black">R$ {cart.reduce((sum, i) => sum + (Number(i.produto.preco) * i.qtd), 0).toFixed(2)}</div>
              </div>
            </div>
            <button 
              onClick={submitOrder}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> CONFIRMAR</>}
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setActiveView('menu')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeView === 'menu' ? "text-purple-600 scale-110" : "text-gray-400"
            )}
          >
            <Utensils size={24} />
            <span className="text-[8px] font-black uppercase tracking-widest">Cardápio</span>
          </button>
          <button 
            onClick={() => setActiveView('orders')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeView === 'orders' ? "text-purple-600 scale-110" : "text-gray-400"
            )}
          >
            <ShoppingBag size={24} />
            <span className="text-[8px] font-black uppercase tracking-widest">Pedidos</span>
          </button>
          <button 
            onClick={() => setActiveView('payment')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeView === 'payment' ? "text-purple-600 scale-110" : "text-gray-400"
            )}
          >
            <Wallet size={24} />
            <span className="text-[8px] font-black uppercase tracking-widest">Receber</span>
          </button>
          <button 
            onClick={() => setActiveView('commissions')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeView === 'commissions' ? "text-purple-600 scale-110" : "text-gray-400"
            )}
          >
            <DollarSign size={24} />
            <span className="text-[8px] font-black uppercase tracking-widest">Ganhos</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
