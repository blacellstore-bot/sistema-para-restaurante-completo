import React, { useEffect, useState } from 'react';
import { Printer, Clock, CheckCircle2, AlertCircle, X, Key, User as UserIcon, ChefHat } from 'lucide-react';
import { PedidoOnline, User, Config } from '../types';

interface CozinhaTabProps {
  pedidosOnline: PedidoOnline[];
  handleUpdatePedido: (id: number, data: Partial<PedidoOnline>) => void;
  users: User[];
  config?: Config;
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
}

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor }: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${confirmColor === 'green' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
            {confirmColor === 'green' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{title}</h3>
          <p className="text-gray-500 font-bold text-sm">{message}</p>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={onConfirm}
              className={`flex-1 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest text-xs transition-all active:scale-95 ${confirmColor === 'green' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
            >
              {confirmText}
            </button>
            <button 
              onClick={onClose}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all"
            >
              Não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KitchenAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: User) => void;
  users: User[];
  title: string;
}

const KitchenAuthModal = ({ isOpen, onClose, onAuth, users, title }: KitchenAuthModalProps) => {
  const [code, setCode] = useState('');
  const [identifiedUser, setIdentifiedUser] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleCodeChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    setCode(cleanVal);
    
    if (cleanVal.length >= 4) {
      const user = users.find(u => u.kitchenCode === cleanVal);
      setIdentifiedUser(user || null);
    } else {
      setIdentifiedUser(null);
    }
  };

  const handleConfirm = () => {
    if (identifiedUser) {
      onAuth(identifiedUser);
      setCode('');
      setIdentifiedUser(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Digite seu Código</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="****"
                className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none font-black text-2xl tracking-[1em] text-center transition-all"
                autoFocus
              />
            </div>
          </div>

          {identifiedUser ? (
            <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-6 text-center animate-in slide-in-from-top-2 duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                <UserIcon size={32} />
              </div>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Cozinheiro Identificado</p>
              <h4 className="text-2xl font-black text-green-700 uppercase tracking-tighter">{identifiedUser.name}</h4>
              
              <button
                onClick={handleConfirm}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                Confirmar Identidade
              </button>
            </div>
          ) : code.length >= 4 ? (
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 text-center">
              <p className="text-red-600 font-black uppercase tracking-widest text-xs">Código Inválido</p>
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 font-bold italic">
              Aguardando código...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CozinhaTab({ pedidosOnline, handleUpdatePedido, users, config }: CozinhaTabProps) {
  const [agora, setAgora] = useState(Date.now());
  const [authModal, setAuthModal] = useState<{
    type: 'iniciar' | 'concluir';
    pedidoId: number;
    pedido?: PedidoOnline;
  } | null>(null);
  const [confirmDirectId, setConfirmDirectId] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pendentes = Array.isArray(pedidosOnline) ? pedidosOnline.filter(p => {
    if (p.status !== 'Pendente' && p.status !== 'Preparando') return false;
    
    const tsInicio = p.timestamp || p.id;
    const tempoPreparo = Number(p.tempoPreparo) || 0;
    const limitMs = tempoPreparo * 60 * 1000;
    const diffMs = agora - tsInicio;

    if (tempoPreparo > 0 && diffMs > (limitMs + 3600000)) return false;
    if (tempoPreparo === 0 && diffMs > (4 * 3600000)) return false;

    return true;
  }) : [];

  const handleConcluir = (id: number, cook: User) => {
    handleUpdatePedido(id, { 
      status: 'Pronto', 
      horaConclusao: Date.now(),
      cookFinishedId: cook.id,
      cookFinishedName: cook.name
    });
    setAuthModal(null);
    alert(`Pedido finalizado por: ${cook.name}`);
  };

  const handleIniciar = (id: number, ped: PedidoOnline, cook: User) => {
    handleUpdatePedido(id, { 
      status: 'Preparando',
      cookStartedId: cook.id,
      cookStartedName: cook.name
    });
    handlePrint(ped);
    setAuthModal(null);
    alert(`Pedido iniciado por: ${cook.name}`);
  };

  const handleConcluirSimplificado = (id: number) => {
    handleUpdatePedido(id, { 
      status: 'Pronto', 
      horaConclusao: Date.now(),
      cookFinishedName: 'Sistema (Simplificado)'
    });
    setConfirmDirectId(null);
  };

  const handlePrint = (ped: PedidoOnline) => {
    const printContent = document.createElement('div');
    printContent.id = 'print-content';
    printContent.style.position = 'fixed';
    printContent.style.left = '-9999px';
    printContent.style.top = '-9999px';
    
    let itensHtml = '';
    let itensArray = [];
    try {
      itensArray = Array.isArray(ped.itens) ? ped.itens : JSON.parse(ped.itens as any);
    } catch (e) {
      itensArray = [];
    }

    itensArray.forEach((it: any) => {
      itensHtml += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
          <span>${it.qtd}x ${it.nome}</span>
          <span>R$ ${(Number(it.preco || 0) * Number(it.qtd || 0)).toFixed(2)}</span>
        </div>
      `;
    });

    printContent.innerHTML = `
      <div style="width: 80mm; font-family: monospace; padding: 10px; color: black; background: white;">
        <h2 style="text-align: center; margin: 0 0 10px 0;">RESTAURANTE</h2>
        <div style="text-align: center; border-bottom: 1px solid black; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="font-size: 20px; font-weight: bold;">COMANDA #${ped.codigoComanda}</div>
          <div style="font-size: 12px;">${new Date(ped.timestamp || ped.id).toLocaleString()}</div>
        </div>
        <div style="margin-bottom: 10px;">
          <div>Mesa/Cliente: <strong>${ped.identificacao}</strong></div>
          <div>Origem: ${ped.origem}</div>
        </div>
        <div style="border-top: 1px solid black; padding-top: 10px;">
          ${itensHtml}
        </div>
        <div style="border-top: 1px solid black; margin-top: 10px; padding-top: 10px; text-align: right; font-size: 18px; font-weight: bold;">
          TOTAL: R$ ${Number(ped.total || 0).toFixed(2)}
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 10px;">
          Obrigado pela preferência!
        </div>
      </div>
    `;

    document.body.appendChild(printContent);

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > *:not(#print-content) {
          display: none !important;
        }
        #print-content {
          position: static !important;
          left: auto !important;
          top: auto !important;
          display: block !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      if (document.body.contains(printContent)) document.body.removeChild(printContent);
      if (document.head.contains(style)) document.head.removeChild(style);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b-2 border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          Monitor da Cozinha 🍳
        </h2>
        <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full font-bold text-sm">
          {pendentes.length} Pedidos Pendentes
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-medium">
        <Clock size={16} />
        Pedidos com mais de 1 hora de atraso são removidos automaticamente desta tela.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pendentes.map((ped) => {
          const tsInicio = ped.timestamp || ped.id;
          const tempoPreparo = Number(ped.tempoPreparo) || 0;
          const limitMs = tempoPreparo * 60 * 1000;
          const diffMs = agora - tsInicio;
          const isAtrasado = diffMs >= limitMs && tempoPreparo > 0;
          
          let timerText = "";
          if (tempoPreparo === 0) {
            timerText = "⏱️ Sem tempo definido";
          } else if (isAtrasado) {
            const atrasoMs = diffMs - limitMs;
            const m = Math.floor(atrasoMs / 60000);
            const s = Math.floor((atrasoMs % 60000) / 1000);
            timerText = `🚨 ATRASADO: +${m}m ${s.toString().padStart(2, '0')}s`;
          } else {
            const restMs = limitMs - diffMs;
            const m = Math.floor(restMs / 60000);
            const s = Math.floor((restMs % 60000) / 1000);
            timerText = `⏳ Tempo: ${m}m ${s.toString().padStart(2, '0')}s`;
          }

          // Ensure itens is an array
          let itensArray = [];
          try {
            const parsed = Array.isArray(ped.itens) ? ped.itens : JSON.parse(ped.itens as any);
            itensArray = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            itensArray = [];
          }

          return (
            <div 
              key={ped.id} 
              className={`bg-white rounded-2xl shadow-md border-l-8 overflow-hidden transition-all ${
                isAtrasado ? "border-red-500 animate-pulse" : ped.origem === 'Balcao' ? "border-teal-500" : "border-orange-500"
              }`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit mb-1 ${
                      ped.origem === 'Balcao' ? "bg-teal-100 text-teal-700" : 
                      ped.origem === 'iFood' ? "bg-red-100 text-red-700" :
                      ped.origem === 'Uber Eats' ? "bg-green-100 text-green-700" :
                      ped.origem === 'Rappi' ? "bg-orange-100 text-orange-700" :
                      ped.origem === '99Food' ? "bg-yellow-100 text-yellow-700" :
                      ped.origem === 'Keeta' ? "bg-blue-100 text-blue-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {ped.origem === 'Balcao' ? 'Balcão' : 
                       ped.origem === 'iFood' ? 'iFood 🍔' :
                       ped.origem === 'Uber Eats' ? 'Uber Eats 🚗' :
                       ped.origem === 'Rappi' ? 'Rappi 🚲' :
                       ped.origem === '99Food' ? '99Food 🍕' :
                       ped.origem === 'Keeta' ? 'Keeta 🥡' :
                       'Mesa/App'}
                    </span>
                    <span className="text-gray-400 text-xs font-medium">⌚ {ped.hora}</span>
                  </div>
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-3 py-1 text-center">
                    <span className="text-2xl font-black text-gray-800 tracking-tighter">{ped.codigoComanda}</span>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  Mesa/Cliente: <span className="text-blue-600">{ped.identificacao}</span>
                </h4>

                <ul className="space-y-2 mb-6">
                  {itensArray.map((it: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="bg-gray-100 text-gray-800 font-bold px-1.5 py-0.5 rounded text-xs">{it.qtd}x</span>
                      <span className="font-medium">{it.nome}</span>
                    </li>
                  ))}
                </ul>

                <div className={`p-3 rounded-xl font-black text-center border-2 mb-4 ${
                  isAtrasado 
                    ? "bg-red-50 text-red-600 border-red-200" 
                    : "bg-green-50 text-green-600 border-green-200"
                }`}>
                  {timerText}
                </div>

                {ped.status === 'Preparando' && (
                  <div className="text-center mb-2">
                    <span className="text-red-600 font-black uppercase text-[10px] tracking-widest animate-pulse">
                      🚨 Pedido Iniciado
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  {config?.kitchen_skip_start ? (
                    <button 
                      onClick={() => setConfirmDirectId(ped.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <CheckCircle2 size={20} />
                      <span className="uppercase tracking-widest text-xs">Pronto!</span>
                    </button>
                  ) : ped.status === 'Preparando' ? (
                    <button 
                      onClick={() => setAuthModal({ type: 'concluir', pedidoId: ped.id })}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <CheckCircle2 size={20} />
                      <span className="uppercase tracking-widest text-xs">Pronto!</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setAuthModal({ type: 'iniciar', pedidoId: ped.id, pedido: ped })}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ChefHat size={20} />
                      <span className="uppercase tracking-widest text-xs">Iniciar Pedido</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handlePrint(ped)}
                    className="bg-gray-100 text-gray-600 p-4 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    <Printer size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {pendentes.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 italic">Nenhum pedido novo.</div>
        )}
      </div>

      <KitchenAuthModal
        isOpen={!!authModal}
        onClose={() => setAuthModal(null)}
        users={users}
        title={authModal?.type === 'iniciar' ? 'Identificação para Iniciar' : 'Identificação para Finalizar'}
        onAuth={(cook) => {
          if (authModal?.type === 'iniciar' && authModal.pedido) {
            handleIniciar(authModal.pedidoId, authModal.pedido, cook);
          } else if (authModal?.type === 'concluir') {
            handleConcluir(authModal.pedidoId, cook);
          }
        }}
      />

      <ConfirmModal 
        isOpen={!!confirmDirectId}
        onClose={() => setConfirmDirectId(null)}
        onConfirm={() => confirmDirectId && handleConcluirSimplificado(confirmDirectId)}
        title="Finalizar Pedido"
        message="Confirmar que este pedido está pronto para entrega?"
        confirmText="Sim, está pronto!"
        confirmColor="green"
      />
    </div>
  );
}
