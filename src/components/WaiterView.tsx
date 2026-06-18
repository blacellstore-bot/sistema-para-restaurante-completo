import React from 'react';
import { LogOut, ShoppingBag, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { PedidoOnline, User } from '../types';

interface WaiterViewProps {
  user: User;
  pedidosOnline: PedidoOnline[];
  handleUpdatePedido: (id: number, data: Partial<PedidoOnline>) => void;
  onLogout: () => void;
}

export default function WaiterView({ user, pedidosOnline, handleUpdatePedido, onLogout }: WaiterViewProps) {
  const meusPedidos = pedidosOnline.filter(p => p.waiterId === user.id && p.status !== 'Concluido' && p.status !== 'Cancelado');

  const handleEntregar = (id: number) => {
    handleUpdatePedido(id, { 
      status: 'Concluido', 
      horaConclusao: Date.now(),
      paymentWaiterId: user.id,
      paymentWaiterName: user.name
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-purple-600 p-6 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-black text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-black text-lg leading-none">{user.name}</div>
              <div className="text-xs font-bold text-purple-200 uppercase tracking-widest mt-1">Painel do Garçom</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minha Comissão</div>
            <div className="text-2xl font-black text-green-600">R$ {Number(user.waiterConfig?.totalCommissionEarned || 0).toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa</div>
            <div className="text-lg font-black text-gray-800">{user.waiterConfig?.commissionRate}%</div>
          </div>
        </div>

        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <ShoppingBag className="text-purple-600" />
          Meus Pedidos Ativos ({meusPedidos.length})
        </h3>

        <div className="space-y-4">
          {meusPedidos.map(ped => (
            <div key={ped.id} className={`bg-white rounded-3xl shadow-md overflow-hidden border-2 ${ped.status === 'Pronto' ? 'border-green-500 animate-pulse' : 'border-gray-100'}`}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <MapPin size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesa</div>
                      <div className="text-xl font-black text-gray-900">{ped.identificacao}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    ped.status === 'Pronto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {ped.status}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {ped.itens.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">
                        <span className="font-black text-purple-600 mr-2">{it.qtd}x</span>
                        {it.nome}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Clock size={14} /> {ped.hora}
                  </div>
                  <div className="text-sm font-black text-gray-900">
                    Total: R$ {Number(ped.total || 0).toFixed(2)}
                  </div>
                </div>

                {ped.status === 'Pronto' && (
                  <button 
                    onClick={() => handleEntregar(ped.id)}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    Entregar na Mesa
                  </button>
                )}
              </div>
            </div>
          ))}

          {meusPedidos.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-400 font-bold italic">Nenhum pedido atribuído a você no momento.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="p-6 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
        Sistema Ultimate Garçom • v2.0
      </footer>
    </div>
  );
}
