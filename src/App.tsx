import React, { useState, useEffect } from 'react';
import { 
  Utensils, Users, CreditCard, ShoppingCart, ChefHat, 
  ClipboardList, BarChart3, Settings, Package, Tv, 
  QrCode, UserCheck, Bell, User as UserIcon, LogOut, Clock, Globe, ShoppingBag,
  Lock, Key, FileText, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  Produto, Cliente, Venda, PedidoOnline, EstoqueItem, Config, User, Categoria, SiteConfig, DeliveryConfig, Mesa, Reserva
} from './types';

// Tab Components
import CardapioTab from './components/CardapioTab';
import ClientesTab from './components/ClientesTab';
import FiadoTab from './components/FiadoTab';
import PDVTab from './components/PDVTab';
import CozinhaTab from './components/CozinhaTab';
import RelatorioTab from './components/RelatorioTab';
import GraficosTab from './components/GraficosTab';
import EstoqueTab from './components/EstoqueTab';
import ConfigTab from './components/ConfigTab';
import PainelTVTab from './components/PainelTVTab';
import QRCodeMesasTab from './components/QRCodeMesasTab';
import ReservaTab from './components/ReservaTab';
import GarcomTab from './components/GarcomTab';
import UsuariosTab from './components/UsuariosTab';
import SiteQrCodeTab from './components/SiteQrCodeTab';
import DeliveryTab from './components/DeliveryTab';
import KitchenUsersTab from './components/KitchenUsersTab';
import FiscalTab from './components/FiscalTab';
import CaixaTab from './components/CaixaTab';
import PublicMenu from './components/PublicMenu';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WaiterView from './components/WaiterView';
import WaiterPortal from './components/WaiterPortal';
import { ShieldAlert, AlertCircle } from 'lucide-react';

import { dataService } from './services/dataService';

export default function App() {
  const [activeTab, setActiveTab] = useState('cartão');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.tenant_id) {
          dataService.setTenantId(user.tenant_id);
        }
        return user;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [users, setUsersState] = useState<User[]>([]);
  const [produtos, setProdutosState] = useState<Produto[]>([]);
  const [clientes, setClientesState] = useState<Cliente[]>([]);
  const [vendas, setVendasState] = useState<Venda[]>([]);
  const [pedidosOnline, setPedidosOnlineState] = useState<PedidoOnline[]>([]);
  const [deliveryConfigs, setDeliveryConfigsState] = useState<DeliveryConfig[]>([]);
  const [estoque, setEstoqueState] = useState<EstoqueItem[]>([]);
  const [categorias, setCategoriasState] = useState<Categoria[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionData, setSuspensionData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [config, setConfigState] = useState<Config>({
    pix: '',
    beneficiario: '',
    nomeBanco: '',
    obs: '',
    kitchen_skip_start: false
  });

  // Load initial data from API
  useEffect(() => {
    // Check for register mode in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') {
      setIsRegistering(true);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        // We don't catch here because we want the main catch block to handle needsPayment errors
        const [u, p, c, v, po, e, cfg, cats, dc, m, r] = await Promise.all([
          dataService.getUsers(),
          dataService.getProdutos(),
          dataService.getClientes(),
          dataService.getVendas(),
          dataService.getPedidos(),
          dataService.getEstoque(),
          dataService.getConfig(),
          dataService.getCategorias(),
          dataService.getDeliveryConfigs(),
          dataService.getMesas(),
          dataService.getReservas()
        ]);

        const safeU = Array.isArray(u) ? u : [];
        const safeP = Array.isArray(p) ? p : [];
        const safeC = Array.isArray(c) ? c : [];
        const safeV = Array.isArray(v) ? v : [];
        const safePo = Array.isArray(po) ? po : [];
        const safeE = Array.isArray(e) ? e : [];
        const safeCfg = cfg && typeof cfg === 'object' ? cfg : { pix: '', beneficiario: '', nomeBanco: '', obs: '', kitchen_skip_start: false };
        const safeCats = Array.isArray(cats) ? cats : [];
        const safeDc = Array.isArray(dc) ? dc : [];
        const safeM = Array.isArray(m) ? m : [];
        const safeR = Array.isArray(r) ? r : [];

        setUsersState(safeU);
        setProdutosState(safeP);
        setClientesState(safeC);
        setVendasState(safeV);
        setPedidosOnlineState(safePo);
        setEstoqueState(safeE);
        setConfigState(safeCfg);
        setCategoriasState(safeCats);
        setDeliveryConfigsState(safeDc);
        setMesas(safeM);
        setReservas(safeR);

        // Extract unique empresas safely
        const uniqueEmpresas = Array.from(new Set(safeC.map((cli: any) => cli?.empresa).filter(Boolean))) as string[];
        setEmpresas(uniqueEmpresas);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        if (err.suspended) {
          setIsSuspended(true);
          setSuspensionData({
            tenantId: err.tenantId || currentUser.tenant_id,
            tenantName: err.tenantName || 'Cliente',
            username: currentUser.username
          });
        }
      }
    };
    loadData();
  }, [currentUser]);

  // Real-time usage calculation
  useEffect(() => {
    if (!currentUser?.trial_ends_at) {
      if (currentUser) setTimeLeft('Ilimitado');
      return;
    }

    const calculateTime = () => {
      const now = new Date();
      const end = new Date(currentUser.trial_ends_at!);
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expirado');
        setIsSuspended(true);
        setSuspensionData({
          tenantId: currentUser.tenant_id,
          tenantName: currentUser.name || 'Cliente',
          username: currentUser.username
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      
      if (days > 0) {
        setTimeLeft(`${days} dias e ${hours}h`);
      } else {
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${hours}h e ${mins}min`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 30000); // Check every 30s
    return () => clearInterval(timer);
  }, [currentUser]);

  // Polling for new orders AND status check
  useEffect(() => {
    if (!currentUser) return;
    
    const pollStatusAndOrders = async () => {
      try {
        // Parallel fetch for efficiency
        const [po, v, status] = await Promise.all([
          dataService.getPedidos(),
          dataService.getVendas(),
          currentUser.tenant_id ? dataService.getStatus(currentUser.tenant_id) : Promise.resolve(null)
        ]);

        if (Array.isArray(po)) {
          setPedidosOnlineState(po);
        }

        if (Array.isArray(v)) {
          setVendasState(v);
        }

        if (status && status.trial_ends_at) {
          setCurrentUser({
            ...currentUser,
            trial_ends_at: status.trial_ends_at,
            active: status.active
          } as User);
          
          if (status.active === 0) {
            setIsSuspended(true);
            setSuspensionData({
              tenantId: currentUser.tenant_id,
              tenantName: currentUser.name || 'Cliente',
              username: currentUser.username
            });
          }
        }
      } catch (err: any) {
        if (err.suspended) {
          setIsSuspended(true);
          setSuspensionData({
            tenantId: err.tenantId || currentUser?.tenant_id,
            tenantName: err.tenantName || 'Cliente',
            username: currentUser?.username
          });
        }
      }
    };

    const interval = setInterval(pollStatusAndOrders, 5000); // More frequent check for "immediate" blocking
    return () => clearInterval(interval);
  }, [currentUser]);

  // Wrapper setters that also update the API
  const setUsers = (newUsers: User[]) => {
    setUsersState(newUsers);
  };

  const setProdutos = async (newProdutos: Produto[]) => {
    const oldProdutos = produtos;
    setProdutosState(newProdutos);
    
    try {
      if (newProdutos.length > oldProdutos.length) {
        const last = newProdutos[newProdutos.length - 1];
        await dataService.saveProduto(last);
      } else if (newProdutos.length < oldProdutos.length) {
        // Delete
        const deleted = oldProdutos.find(op => !newProdutos.some(np => np.id === op.id));
        if (deleted) await dataService.deleteProduto(deleted.id);
      } else {
        // Update
        for (let i = 0; i < newProdutos.length; i++) {
          if (JSON.stringify(newProdutos[i]) !== JSON.stringify(oldProdutos[i])) {
            await dataService.updateProduto(newProdutos[i].id, newProdutos[i]);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      // Revert state on error
      setProdutosState(oldProdutos);
    }
  };

  const setCategorias = async (newCats: Categoria[]) => {
    const oldCats = categorias;
    setCategoriasState(newCats);
    
    try {
      if (newCats.length > oldCats.length) {
        const last = newCats[newCats.length - 1];
        await dataService.saveCategoria(last);
      } else if (newCats.length < oldCats.length) {
        const deleted = oldCats.find(oc => !newCats.some(nc => nc.id === oc.id));
        if (deleted) await dataService.deleteCategoria(deleted.id);
      }
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err);
      setCategoriasState(oldCats);
    }
  };

  const setClientes = async (newClientes: Cliente[]) => {
    const oldClientes = clientes;
    setClientesState(newClientes);
    try {
      if (newClientes.length > oldClientes.length) {
        const last = newClientes[newClientes.length - 1];
        if (last) await dataService.saveCliente(last);
      } else if (newClientes.length < oldClientes.length) {
        const deleted = oldClientes.find(oc => !newClientes.some(nc => nc.id === oc.id));
        if (deleted) await dataService.deleteCliente(deleted.id);
      }
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      setClientesState(oldClientes);
    }
  };

  const setVendas = async (newVendas: Venda[]) => {
    const oldVendas = vendas;
    setVendasState(newVendas);
    try {
      const last = newVendas[newVendas.length - 1];
      if (last) await dataService.saveVenda(last);
    } catch (err: any) {
      console.error('Erro ao salvar venda:', err);
      setVendasState(oldVendas);
    }
  };

  const setPedidosOnline = async (newPedidos: PedidoOnline[]) => {
    setPedidosOnlineState(newPedidos);
  };

  const setDeliveryConfigs = async (newConfigs: DeliveryConfig[]) => {
    setDeliveryConfigsState(newConfigs);
  };

  const handleUpdatePedido = async (id: number, data: Partial<PedidoOnline>) => {
    try {
      await dataService.updatePedido(id, data);
      setPedidosOnlineState(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
    }
  };

  const handleCreatePedido = async (pedido: any) => {
    try {
      await dataService.savePedido(pedido);
      // Refresh list
      const po = await dataService.getPedidos();
      if (Array.isArray(po)) {
        setPedidosOnlineState(po);
      }
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
    }
  };

  const setEstoque = async (newEstoque: EstoqueItem[]) => {
    setEstoqueState(newEstoque);
    const last = newEstoque[newEstoque.length - 1];
    if (last) await dataService.saveEstoque(last);
  };

  const setConfig = async (newConfig: Config) => {
    setConfigState(newConfig);
    await dataService.saveConfig(newConfig);
  };

  const handleSaveMesa = async (mesa: Partial<Mesa>) => {
    try {
      if (mesa.id) {
        await dataService.updateMesa(mesa.id, mesa);
      } else {
        await dataService.saveMesa(mesa);
      }
      const m = await dataService.getMesas();
      setMesas(m);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar mesa');
    }
  };

  const handleDeleteMesa = async (id: number) => {
    try {
      await dataService.deleteMesa(id);
      setMesas(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir mesa');
    }
  };

  const handleSaveReserva = async (reser: Partial<Reserva>) => {
    try {
      if (reser.id) {
        await dataService.updateReserva(reser.id, reser);
      } else {
        await dataService.saveReserva(reser);
      }
      const r = await dataService.getReservas();
      setReservas(r);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar reserva');
    }
  };

  const handleDeleteReserva = async (id: number) => {
    try {
      await dataService.deleteReserva(id);
      setReservas(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir reserva');
    }
  };

  const allTabs = [
    { id: 'cartão', label: 'Cardápio', icon: Utensils },
    { id: 'cadastro', label: 'Clientes', icon: Users },
    { id: 'irmão', label: 'Lançar Fiado', icon: CreditCard },
    { id: 'fazerOrdem', label: 'Novo Pedido', icon: ShoppingCart, className: "bg-teal-50 text-teal-700 border-teal-200 active:bg-teal-600" },
    { id: 'pedidosQr', label: 'Cozinha Geral', icon: ChefHat, className: "bg-orange-50 text-orange-700 border-orange-200 active:bg-orange-600" },
    { id: 'baixaCozinha', label: 'Baixa Pratos', icon: UserCheck, className: "bg-rose-50 text-rose-700 border-rose-200 active:bg-rose-600" },
    { id: 'reservas', label: 'Reserva', icon: Clock, className: "bg-cyan-50 text-cyan-700 border-cyan-200 active:bg-cyan-600" },
    { id: 'relacional', label: 'Extrato', icon: ClipboardList },
    { id: 'gráficos', label: 'Gráficos', icon: BarChart3 },
    { id: 'configurar', label: 'Config', icon: Settings },
    { id: 'estoque', label: 'Estoque', icon: Package, className: "bg-indigo-50 text-indigo-700 border-indigo-200 active:bg-indigo-600" },
    { id: 'painelCliente', label: 'Painel TV', icon: Tv, className: "bg-green-50 text-green-700 border-green-200 active:bg-green-600" },
    { id: 'gmeas', label: 'QR Code Mesas', icon: QrCode, className: "bg-amber-50 text-amber-700 border-amber-200 active:bg-amber-600" },
    { id: 'siteQr', label: 'Site QR Code', icon: Globe, className: "bg-blue-50 text-blue-700 border-blue-200 active:bg-blue-600" },
    { id: 'entrega', label: '+ Delivery', icon: ShoppingBag, className: "bg-red-50 text-red-700 border-red-200 active:bg-red-600" },
    { id: 'porquinho', label: 'Garçom', icon: Bell, className: "bg-purple-50 text-purple-700 border-purple-200 active:bg-purple-600" },
    { id: 'caixa', label: 'Fluxo de Caixa', icon: Wallet, className: "bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-600" },
    { id: 'usuários', label: 'Usuários', icon: UserIcon, className: "bg-blue-50 text-blue-700 border-blue-200 active:bg-blue-600" },
    { id: 'usuários de cozinha', label: 'Usuário Login', icon: Key, className: "bg-orange-50 text-orange-700 border-orange-200 active:bg-orange-600" },
    { id: 'promotor fiscal', label: 'Gestão Fiscal', icon: FileText, className: "bg-blue-50 text-blue-700 border-blue-200 active:bg-blue-600" },
  ];

  const hasPermission = (tabId: string) => {
    if (!currentUser) return false;
    
    // Config should always be accessible to admin
    if (tabId === 'configurar' && currentUser.role === 'admin') return true;

    // 1. Check direct permissions object (Highest Priority)
    if (currentUser.permissions && typeof currentUser.permissions === 'object') {
      if (currentUser.permissions[tabId] === true) return true;
      if (currentUser.permissions[tabId] === false) return false;
    }

    // 2. Fallback for employees (if not in object, and they are not admin, they don't have it)
    if (currentUser.role !== 'admin') {
      return false;
    }
    
    // 3. Admin - Full Access
    return true;
  };

  const visibleTabs = allTabs.filter(tab => hasPermission(tab.id));

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (user.tenant_id) {
      dataService.setTenantId(user.tenant_id);
    }
    // Set first available tab as active
    const firstTab = allTabs.find(t => user.permissions && user.permissions[t.id] === true);
    if (firstTab) {
      setActiveTab(firstTab.id);
    } else {
      setActiveTab('cartão');
    }
  };

  const handleRegisterAdmin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (user.tenant_id) {
      dataService.setTenantId(user.tenant_id);
    }
    setActiveTab('cartão');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tenant_id');
    setActiveTab('cartão');
  };

  // Public Menu Routing
  const path = window.location.pathname;
  if (path.startsWith('/menu/')) {
    const parts = path.split('/').filter(Boolean);
    const tenantId = parts[1];
    const mesa = parts[2];
    if (tenantId) {
      return <PublicMenu tenantId={tenantId} mesa={mesa} />;
    }
  }

  // Waiter Portal Routing
  if (path.startsWith('/garcom/')) {
    const parts = path.split('/').filter(Boolean);
    const menuCode = parts[1];
    if (menuCode) {
      return <WaiterPortal menuCode={menuCode} />;
    }
  }

  const SidebarItem = ({ 
    active, icon: Icon, label, onClick, locked 
  }: { 
    active: boolean, icon: any, label: string, onClick: () => void, locked: boolean, key?: string
  }) => {
    const isLocked = locked;

    const handleClick = () => {
      if (isLocked) {
        alert(`Acesso Bloqueado: Você não tem permissão para acessar o módulo "${label}". Entre em contato com o administrador para liberar o acesso.`);
        return;
      }
      onClick();
    };

    return (
      <div 
        onClick={handleClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all relative cursor-pointer ${
          !isLocked 
            ? active 
              ? "bg-blue-600 text-white shadow-lg" 
              : "text-white hover:bg-white/10" 
            : "text-gray-400 opacity-50 grayscale bg-white/5 border border-white/5"
        }`}
      >
        <Icon size={18} className={!isLocked ? (active ? "text-white" : "text-blue-500") : "text-gray-600"} />
        <span className="flex-1 font-bold text-[11px] uppercase tracking-tighter">
          {label}
        </span>
        {isLocked && (
          <Lock size={14} className="text-gray-500" />
        )}
      </div>
    );
  };

  if (!currentUser) {
    if (isRegistering) {
      return (
        <RegisterScreen 
          onRegisterAdmin={handleRegisterAdmin}
          onBack={() => setIsRegistering(false)}
        />
      );
    }
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onGoToRegister={() => setIsRegistering(true)}
      />
    );
  }

  if (isSuspended) {
    return (
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-2xl z-[5000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl overflow-hidden max-w-lg w-full"
        >
          <div className="bg-red-600 p-10 text-center relative">
            <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              <Lock size={54} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Acesso Bloqueado</h2>
            <p className="text-red-100 text-sm mt-3 font-bold uppercase tracking-wider">Conta Suspensa pelo Suporte</p>
          </div>

          <div className="p-10 text-center space-y-8">
            <div className="space-y-2">
              <p className="text-gray-600 font-bold leading-relaxed">
                Olá <span className="text-red-600 font-black">{suspensionData?.tenantName}</span>, identificamos uma pendência ou suspensão manual no seu acesso.
              </p>
              <p className="text-gray-400 text-sm italic">
                Para reativar sua licença agora mesmo, clique no botão abaixo.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="flex justify-center gap-4 text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
                <span>ID: {suspensionData?.tenantId}</span>
                <span>•</span>
                <span>USER: {suspensionData?.username}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                const adminWhatsApp = (import.meta as any).env.VITE_ADMIN_WHATSAPP || '5562994075417';
                const message = `Olá equipe de suporte! Meu sistema foi BLOQUEADO agora.\n\nDados do Cliente:\nEmpresa: ${suspensionData?.tenantName}\nID: ${suspensionData?.tenantId}\nUsuário: ${suspensionData?.username}\n\nFavor verificar o motivo.`;
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/${adminWhatsApp.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
              }}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 group"
            >
              <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              Falar com Suporte no WhatsApp
            </button>
            <button 
              onClick={() => handleLogout()}
              className="w-full text-red-500 font-bold hover:underline"
            >
              Fazer Logout
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentUser.role === 'waiter') {
    return (
      <WaiterView 
        user={currentUser}
        pedidosOnline={pedidosOnline}
        handleUpdatePedido={handleUpdatePedido}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-2 shrink-0 overflow-y-auto">
        <div className="flex flex-col items-center gap-2 mb-8 py-4 border-b border-white/5 text-center">
          <div className="flex items-center gap-2">
            <Utensils className="text-blue-500" size={24} />
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">
              Restaurante
            </h1>
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Painel de Gestão</div>
        </div>

        <nav className="flex-1 space-y-1">
          {allTabs.map((tab) => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              locked={!hasPermission(tab.id)}
            />
          ))}
        </nav>

        <div className="mt-8 pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 p-3 text-gray-400">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0">
              {(currentUser?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-black text-white truncate">{currentUser?.name || "Usuário"}</div>
              <div className="text-gray-500 text-[8px] font-bold uppercase tracking-widest truncate">
                {currentUser.role === 'admin' ? 'Administrador' : 'Funcionário'}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold uppercase text-[10px] tracking-widest"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                  {allTabs.find(t => t.id === activeTab)?.icon && React.createElement(allTabs.find(t => t.id === activeTab)!.icon, { size: 28, className: "text-blue-600" })}
                </div>
                <div>
                   <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                     {allTabs.find(t => t.id === activeTab)?.label}
                   </h2>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Módulo gerenciador</p>
                </div>
             </div>

             <div className="flex items-center gap-3 text-white">
                <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-500/30">
                  <Clock size={14} />
                  {timeLeft ? `Seu tempo de uso no sistema: ${timeLeft}` : new Date().toLocaleDateString('pt-BR')}
                </div>
             </div>
          </header>

          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 min-h-[calc(100vh-14rem)]">
            <main className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {!hasPermission(activeTab) ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-4 border-dashed border-gray-200">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                        <Lock size={40} className="text-gray-400" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-400 uppercase tracking-tighter mb-2">Módulo Bloqueado</h2>
                      <p className="text-gray-400 font-bold text-center max-w-xs">
                        Você não tem permissão para acessar o módulo <span className="text-gray-500 underline">{allTabs.find(t => t.id === activeTab)?.label}</span>. 
                        Contate o administrador para liberar o acesso.
                      </p>
                    </div>
                  ) : (
                    <>
                   {activeTab === 'cartão' && (
                    <CardapioTab 
                      produtos={produtos} 
                      setProdutos={setProdutos} 
                      categorias={categorias}
                      setCategorias={setCategorias}
                    />
                  )}
                  {activeTab === 'cadastro' && <ClientesTab clientes={clientes} setClientes={setClientes} empresas={empresas} setEmpresas={setEmpresas} />}
                  {activeTab === 'irmão' && <FiadoTab clientes={clientes} produtos={produtos} vendas={vendas} setVendas={setVendas} pedidosOnline={pedidosOnline} setPedidosOnline={handleCreatePedido} />}
                  {activeTab === 'fazerOrdem' && <PDVTab produtos={produtos} pedidosOnline={pedidosOnline} setPedidosOnline={handleCreatePedido} />}
                  {activeTab === 'pedidosQr' && <CozinhaTab pedidosOnline={pedidosOnline} handleUpdatePedido={handleUpdatePedido} users={users} config={config} />}
                  {activeTab === 'baixaCozinha' && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <h2 className="text-2xl font-black text-rose-600 mb-4">Baixa de Pratos</h2>
                      <p className="text-gray-500 mb-8">Digite o código da comanda para dar baixa.</p>
                      <input 
                        type="number" 
                        placeholder="0000"
                        className="text-6xl font-black text-center p-8 border-4 border-dashed border-gray-200 rounded-3xl w-64 outline-none focus:border-rose-500 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            const ped = pedidosOnline.find(p => p.codigoComanda === parseInt(val) && p.status === 'Pendente');
                            if (ped) {
                              handleUpdatePedido(ped.id, { 
                                status: 'Concluido', 
                                horaConclusao: Date.now(),
                                paymentWaiterId: currentUser.id,
                                paymentWaiterName: currentUser.name
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  {activeTab === 'relacional' && <RelatorioTab clientes={clientes} vendas={vendas} setVendas={setVendas} config={config} />}
                  {activeTab === 'gráficos' && <GraficosTab vendas={vendas} pedidosOnline={pedidosOnline} />}
                  {activeTab === 'configurar' && <ConfigTab config={config} setConfig={setConfig} currentUser={currentUser} />}
                  {activeTab === 'estoque' && <EstoqueTab estoque={estoque} setEstoque={setEstoque} />}
                  {activeTab === 'painelCliente' && <PainelTVTab pedidosOnline={pedidosOnline} />}
                  {activeTab === 'gmeas' && (
                    <QRCodeMesasTab 
                      mesas={mesas} 
                      onSaveMesa={handleSaveMesa} 
                      onDeleteMesa={handleDeleteMesa} 
                    />
                  )}
                  {activeTab === 'reservas' && (
                    <ReservaTab 
                      mesas={mesas}
                      reservas={reservas}
                      onSaveReserva={handleSaveReserva}
                      onDeleteReserva={handleDeleteReserva}
                    />
                  )}
                  {activeTab === 'siteQr' && <SiteQrCodeTab />}
                  {activeTab === 'entrega' && <DeliveryTab deliveryConfigs={deliveryConfigs} setDeliveryConfigs={setDeliveryConfigs} />}
                  {activeTab === 'porquinho' && <GarcomTab pedidosOnline={pedidosOnline} handleUpdatePedido={handleUpdatePedido} users={users} setUsers={setUsers} />}
                  {activeTab === 'caixa' && <CaixaTab currentUser={currentUser} vendas={vendas} pedidosOnline={pedidosOnline} />}
                  {activeTab === 'usuários' && <UsuariosTab users={users} setUsers={setUsers} tabs={allTabs.filter(t => t.id !== 'usuários' && t.id !== 'usuários de cozinha')} pedidosOnline={pedidosOnline} />}
                  {activeTab === 'usuários de cozinha' && <KitchenUsersTab users={users} setUsers={setUsers} config={config} setConfig={setConfigState} />}
                  {activeTab === 'promotor fiscal' && <FiscalTab pedidosOnline={pedidosOnline} config={config} setConfig={setConfig} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  </main>
</div>
  );
}
