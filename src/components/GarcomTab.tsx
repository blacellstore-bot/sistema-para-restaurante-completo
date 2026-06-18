import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, Users, DollarSign, Percent, Plus, Trash2, ExternalLink, Copy } from 'lucide-react';
import { PedidoOnline, User } from '../types';
import { dataService } from '../services/dataService';

interface GarcomTabProps {
  pedidosOnline: PedidoOnline[];
  handleUpdatePedido: (id: number, data: Partial<PedidoOnline>) => void;
  users: User[];
  setUsers: (users: User[]) => void;
}

export default function GarcomTab({ pedidosOnline, handleUpdatePedido, users, setUsers }: GarcomTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pedidos' | 'gestao'>('pedidos');
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterUsername, setNewWaiterUsername] = useState('');
  const [newWaiterPassword, setNewWaiterPassword] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [onQrExtra, setOnQrExtra] = useState(true);
  const [onConfirmed, setOnConfirmed] = useState(true);
  const [menuCode, setMenuCode] = useState<string>('');

  useEffect(() => {
    dataService.getSubscription().then(sub => {
      setMenuCode(sub.menuCode || localStorage.getItem('tenant_id') || '');
    }).catch(() => {
      setMenuCode(localStorage.getItem('tenant_id') || '');
    });
  }, []);

  const waiterPortalUrl = `https://restaurantesistema.com/garcom/${menuCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(waiterPortalUrl);
    alert('Link copiado!');
  };

  const waiters = users.filter(u => u.role === 'waiter');
  const aguardando = pedidosOnline.filter(p => p.status === 'Aguardando Garçom');

  const getWaiterStats = (waiterId: string) => {
    const waiterOrders = pedidosOnline.filter(p => p.waiterId === waiterId && p.status === 'Concluido');
    const totalSales = waiterOrders.reduce((sum, p) => sum + Number(p.total), 0);
    const totalCommission = waiterOrders.reduce((sum, p) => sum + Number(p.commissionValue || 0), 0);
    return { totalSales, totalCommission };
  };

  const handleAddWaiter = () => {
    if (!newWaiterName || !newWaiterUsername || !newWaiterPassword) {
      alert("Preencha todos os campos do garçom!");
      return;
    }
    const newUser: any = {
      id: Date.now().toString(),
      name: newWaiterName,
      username: newWaiterUsername,
      password: newWaiterPassword,
      role: 'waiter',
      permissions: ['garcom'], // Waiters only see the waiter panel
      waiterConfig: {
        commissionRate,
        commissionOnQrExtra: onQrExtra,
        commissionOnConfirmed: onConfirmed,
        totalCommissionEarned: 0
      }
    };

    dataService.saveUser(newUser)
      .then((response) => {
        if (response.success) {
          const userWithId = { ...newUser, id: response.id || newUser.id };
          setUsers([...users, userWithId]);
          setNewWaiterName('');
          setNewWaiterUsername('');
          setNewWaiterPassword('');
          alert("Garçom cadastrado com sucesso!");
        }
      })
      .catch(err => {
        console.error('Erro ao salvar garçom:', err);
        alert('Erro ao salvar garçom: ' + err.message);
      });
  };

  const handleConfirmar = (id: number) => {
    // Fair distribution logic: find the next waiter
    if (waiters.length === 0) {
      alert("⚠️ Cadastre pelo menos um garçom para distribuir os pedidos!");
      return;
    }

    // Simple distribution: find waiter with fewest active orders or just round-robin
    // Let's do round-robin based on total orders assigned
    const assignedOrders = pedidosOnline.filter(p => p.waiterId);
    const nextWaiter = waiters[assignedOrders.length % waiters.length];

    const p = pedidosOnline.find(ped => ped.id === id);
    if (!p) return;

    const isExtra = pedidosOnline.some(oldP => oldP.identificacao === p.identificacao && oldP.id !== p.id && oldP.status === 'Concluido');
    
    let shouldEarnCommission = false;
    if (nextWaiter.waiterConfig?.commissionOnConfirmed) shouldEarnCommission = true;
    if (nextWaiter.waiterConfig?.commissionOnQrExtra && isExtra) shouldEarnCommission = true;

    const commission = shouldEarnCommission ? (p.total * (nextWaiter.waiterConfig?.commissionRate || 0)) / 100 : 0;
    
    handleUpdatePedido(id, { 
      status: 'Pendente', 
      timestamp: Date.now(),
      waiterId: nextWaiter.id,
      commissionValue: commission,
      isExtra: isExtra
    });

    // Update waiter's total commission
    setUsers(users.map(u => {
      if (u.id === nextWaiter.id && u.waiterConfig) {
        return {
          ...u,
          waiterConfig: {
            ...u.waiterConfig,
            totalCommissionEarned: u.waiterConfig.totalCommissionEarned + commission
          }
        };
      }
      return u;
    }));

    alert(`✅ Pedido enviado para a Cozinha e atribuído ao garçom ${nextWaiter.name}!`);
  };

  const handleCancelar = (id: number) => {
    if (window.confirm("Tem certeza que deseja cancelar este pedido?")) {
      handleUpdatePedido(id, { status: 'Cancelado' });
    }
  };

  const handleDeleteWaiter = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este garçom?')) return;
    try {
      await dataService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Erro ao excluir garçom:', err);
      alert('Erro ao excluir garçom');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-purple-800 flex items-center gap-2">
          Painel do Garçom 🤵
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveSubTab('pedidos')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'pedidos' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
          >
            Pedidos Pendentes ({aguardando.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('gestao')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'gestao' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
          >
            Gestão de Garçons
          </button>
        </div>
      </div>

      {activeSubTab === 'pedidos' ? (
        <div className="space-y-6">
          {/* Link de Acesso Rápido */}
          <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <ExternalLink className="text-purple-600" size={24} />
              </div>
              <div>
                <h4 className="font-black text-purple-900 text-sm uppercase tracking-widest">Portal do Garçom</h4>
                <p className="text-purple-600 text-xs font-bold">{waiterPortalUrl}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={copyToClipboard}
                className="flex-1 md:flex-none bg-white hover:bg-purple-100 text-purple-600 font-black px-6 py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Copy size={18} /> COPIAR
              </button>
              <a 
                href={waiterPortalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                ABRIR <ExternalLink size={18} />
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {aguardando.map((ped) => (
            <div key={ped.id} className="bg-white rounded-2xl shadow-lg border-l-8 border-purple-600 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {ped.origem === 'App' ? 'QR Code' : ped.origem}
                  </span>
                  <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
                    <Clock size={12} /> {ped.hora}
                  </span>
                </div>

                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center mb-4">
                  <span className="text-4xl font-black text-gray-800 tracking-tighter">
                    {ped.codigoComanda || '----'}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  Mesa/Cliente: <span className="text-red-500">{ped.identificacao}</span>
                </h4>

                <ul className="space-y-2 mb-6 border-y border-gray-50 py-4">
                  {ped.itens.map((it, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded text-xs">{it.qtd}x</span>
                      <span className="font-medium">{it.nome}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-400 font-bold uppercase text-xs">Total</span>
                  <span className="text-xl font-black text-gray-900">R$ {Number(ped.total || 0).toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleConfirmar(ped.id)}
                    className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    Confirmar Mesa
                  </button>
                  <button 
                    onClick={() => handleCancelar(ped.id)}
                    className="flex-1 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 font-black py-4 rounded-xl transition-all flex items-center justify-center"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {aguardando.length === 0 && (
            <div className="col-span-full py-24 text-center text-gray-400 flex flex-col items-center gap-4">
              <Bell size={64} className="opacity-10" />
              <p className="text-xl font-bold italic">Nenhum pedido aguardando confirmação.</p>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Link de Acesso Rápido */}
          <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <ExternalLink className="text-purple-600" size={24} />
              </div>
              <div>
                <h4 className="font-black text-purple-900 text-sm uppercase tracking-widest">Portal do Garçom</h4>
                <p className="text-purple-600 text-xs font-bold">{waiterPortalUrl}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={copyToClipboard}
                className="flex-1 md:flex-none bg-white hover:bg-purple-100 text-purple-600 font-black px-6 py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Copy size={18} /> COPIAR
              </button>
              <a 
                href={waiterPortalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                ABRIR <ExternalLink size={18} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cadastro de Garçom */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Plus className="text-purple-600" />
              Cadastrar Novo Garçom
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={newWaiterName}
                  onChange={(e) => setNewWaiterName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Carlos Alberto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Usuário</label>
                  <input 
                    type="text" 
                    value={newWaiterUsername}
                    onChange={(e) => setNewWaiterUsername(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="carlos.garcom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Senha</label>
                  <input 
                    type="password" 
                    value={newWaiterPassword}
                    onChange={(e) => setNewWaiterPassword(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl space-y-4">
              <h4 className="font-black text-purple-800 text-sm flex items-center gap-2">
                <DollarSign size={16} /> Configuração de Comissão
              </h4>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-purple-400 uppercase mb-1">Taxa (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full p-2 pl-8 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Percent className="absolute left-2 top-2.5 text-purple-400" size={14} />
                  </div>
                </div>
                <div className="flex-[2] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onConfirmed}
                      onChange={(e) => setOnConfirmed(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-600">Pedidos Confirmados</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onQrExtra}
                      onChange={(e) => setOnQrExtra(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-600">Extras via QR Code</span>
                  </label>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddWaiter}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-lg transition-all"
            >
              Salvar Garçom
            </button>
          </div>

          {/* Lista de Garçons */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Users className="text-gray-400" />
              Equipe de Garçons
            </h3>
            <div className="space-y-3">
              {waiters.map(waiter => (
                <div key={waiter.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center font-black text-purple-600">
                      {waiter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{waiter.name}</div>
                      <div className="text-xs text-gray-500">
                        Taxa: {waiter.waiterConfig?.commissionRate}% • 
                        <span className="text-blue-600 font-bold ml-1">
                          Vendas: R$ {Number(getWaiterStats(waiter.id).totalSales || 0).toFixed(2)}
                        </span> • 
                        <span className="text-green-600 font-bold ml-1">
                          Comissão: R$ {Number(getWaiterStats(waiter.id).totalCommission || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteWaiter(waiter.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {waiters.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold italic">
                  Nenhum garçom cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
