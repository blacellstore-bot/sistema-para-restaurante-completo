import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, DollarSign, History, AlertCircle, CheckCircle2, 
  ArrowRight, CreditCard, Wallet, Calculator, X, Save, TrendingUp,
  User as UserIcon, Clock, FileText, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../services/dataService';
import { User, CaixaFluxo, Venda, PedidoOnline } from '../types';

interface CaixaTabProps {
  currentUser: User | null;
  vendas: Venda[];
  pedidosOnline: PedidoOnline[];
}

const SessionReportModal = ({ 
  session, 
  vendas, 
  pedidosOnline, 
  onClose 
}: { 
  session: CaixaFluxo; 
  vendas: Venda[]; 
  pedidosOnline: PedidoOnline[]; 
  onClose: () => void 
}) => {
  const calculateTotals = () => {
    const start = Number(session.dataAbertura);
    const end = session.dataFechamento ? Number(session.dataFechamento) : Date.now();
    
    const startOfShift = new Date(start);
    startOfShift.setHours(0, 0, 0, 0);

    const filteredVendas = vendas.filter(v => {
      const vTime = new Date(v.data).getTime();
      if (isNaN(vTime)) return false;
      if (v.data.includes(':') || vTime > 10000000000000) {
        return vTime >= start && vTime <= end;
      }
      return vTime >= startOfShift.getTime() && vTime <= end;
    });

    const filteredPedidos = pedidosOnline.filter(p => {
      const pTime = Number(p.timestamp);
      const statusValidos = ['Pendente', 'Preparando', 'Pronto', 'Concluido'];
      return pTime >= start && pTime <= end && statusValidos.includes(p.status);
    });

    let totals = { total: 0, dinheiro: 0, pix: 0, cartao: 0 };

    filteredVendas.forEach(v => {
      const vValor = Number(v.valor) || 0;
      totals.total += vValor;
      const fp = String(v.formaPagamento || '').toLowerCase();
      if (fp.includes('dinheiro')) totals.dinheiro += vValor;
      else if (fp.includes('pix')) totals.pix += vValor;
      else totals.cartao += vValor;
    });

    filteredPedidos.forEach(p => {
      const pTotal = Number(p.total) || 0;
      totals.total += pTotal;
      const fp = String(p.formaPagamento || '').toLowerCase();
      if (fp.includes('dinheiro')) totals.dinheiro += pTotal;
      else if (fp.includes('pix')) totals.pix += pTotal;
      else totals.cartao += pTotal;
    });

    return totals;
  };

  const report = calculateTotals();
  const expectativaDinheiro = Number(session.valorInicial) + report.dinheiro;
  const diferenca = session.valorFinal ? (Number(session.valorFinal) - expectativaDinheiro) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="bg-gray-900 p-8 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <FileText size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Relatório Detalhado de Turno</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Sessão #{session.id}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase mt-1">Operador: {session.userName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Início do Turno</p>
              <p className="font-black text-gray-900">{new Date(session.dataAbertura).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fim do Turno</p>
              <p className="font-black text-gray-900">{session.dataFechamento ? new Date(session.dataFechamento).toLocaleString() : 'Em aberto'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b pb-2">Movimentação por Forma de Pagamento</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-[9px] font-black text-green-700 uppercase mb-1">DINHEIRO</p>
                <p className="text-lg font-black text-green-900">R$ {report.dinheiro.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[9px] font-black text-blue-700 uppercase mb-1">PIX</p>
                <p className="text-lg font-black text-blue-900">R$ {report.pix.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <p className="text-[9px] font-black text-purple-700 uppercase mb-1">CARTÕES</p>
                <p className="text-lg font-black text-purple-900">R$ {report.cartao.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-200 space-y-6">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-gray-500 uppercase tracking-widest">Fundo de Troco (Inicial)</span>
              <span className="font-black text-gray-900">R$ {Number(session.valorInicial).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-gray-500 uppercase tracking-widest">Vendas em Dinheiro</span>
              <span className="font-black text-green-600">+ R$ {report.dinheiro.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center">
              <span className="font-black text-gray-900 uppercase tracking-widest text-xs">Expectativa em Gaveta</span>
              <span className="text-xl font-black text-gray-900">R$ {expectativaDinheiro.toFixed(2)}</span>
            </div>
            {session.status === 'fechado' && (
              <>
                <div className="flex justify-between items-center">
                  <span className="font-black text-gray-900 uppercase tracking-widest text-xs">Fechamento Informado</span>
                  <span className="text-xl font-black text-blue-600">R$ {Number(session.valorFinal).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center p-4 rounded-2xl ${diferenca === 0 ? 'bg-green-100' : diferenca > 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <span className="font-black uppercase tracking-widest text-xs">Diferença / Quebra</span>
                  <span className={`text-xl font-black ${diferenca === 0 ? 'text-green-700' : diferenca > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {diferenca === 0 ? 'OK' : `R$ ${diferenca.toFixed(2)}`}
                  </span>
                </div>
              </>
            )}
          </div>

          {session.observacoes && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Observações do Fechamento</h4>
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-medium text-amber-900 italic">
                "{session.observacoes}"
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100">
           <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
           >
             Fechar Relatório
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function CaixaTab({ currentUser, vendas, pedidosOnline }: CaixaTabProps) {
  const [caixaStatus, setCaixaStatus] = useState<CaixaFluxo | null>(null);
  const [historico, setHistorico] = useState<CaixaFluxo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CaixaFluxo | null>(null);
  
  // Abrir Caixa Form
  const [valorInicial, setValorInicial] = useState('');
  const [adminUsername, setAdminUsername] = useState(currentUser?.username || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fechar Caixa Form
  const [valorFinal, setValorFinal] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    loadCaixa();
  }, []);

  const loadCaixa = async () => {
    setLoading(true);
    try {
      const [status, hist] = await Promise.all([
        dataService.getCaixaStatus(),
        dataService.getCaixaHistorico()
      ]);
      setCaixaStatus(status);
      setHistorico(hist);
    } catch (err) {
      console.error('Erro ao carregar caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!valorInicial || !adminUsername || !adminPassword) {
      setError('Preencha todos os campos para autorizar a abertura.');
      return;
    }

    setActionLoading(true);
    try {
      await dataService.abrirCaixa({
        username: adminUsername,
        password: adminPassword,
        valorInicial: Number(valorInicial),
        userName: `${currentUser?.username || 'Operador'} - ${currentUser?.name || ''}`
      });
      setValorInicial('');
      setAdminPassword('');
      loadCaixa();
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir caixa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaStatus) return;

    if (!valorFinal) {
      alert('Informe o valor final em dinheiro na gaveta.');
      return;
    }

    setActionLoading(true);
    try {
      await dataService.fecharCaixa({
        id: caixaStatus.id,
        valorFinal: Number(valorFinal),
        observacoes
      });
      setValorFinal('');
      setObservacoes('');
      loadCaixa();
    } catch (err: any) {
      alert(err.message || 'Erro ao fechar caixa');
    } finally {
      setActionLoading(false);
    }
  };

  // Cálculo de faturamento no período do caixa aberto
  const getFaturamentoPeriodo = () => {
    if (!caixaStatus) return { total: 0, dinheiro: 0, pix: 0, cartao: 0 };
    
    const start = Number(caixaStatus.dataAbertura) || 0;
    
    // Filtrar vendas (PDV/Legado)
    const startOfShift = new Date(start);
    startOfShift.setHours(0, 0, 0, 0);

    const vendasPeriodo = (vendas || []).filter(v => {
      if (!v || !v.data) return false;
      const vDate = new Date(v.data);
      const vTime = vDate.getTime();
      if (isNaN(vTime)) return false;

      // Se a venda tem precisão de milisegundos (timestamp), compara direto
      if (v.data.includes(':') || vTime > 10000000000000) {
        return vTime >= start;
      }
      
      // Se for apenas data (YYYY-MM-DD), incluímos se for o mesmo dia ou posterior ao início do turno
      return vTime >= startOfShift.getTime();
    });

    // Filtrar pedidos (QR Code/Garçom/Site/PDV)
    const pedidosPeriodo = (pedidosOnline || []).filter(p => {
       if (!p || !p.timestamp) return false;
       const pTime = Number(p.timestamp);
       
       // Incluímos pedidos que não foram cancelados e estão no fluxo de atendimento
       // PDV entra como 'Pendente', Garçom confirmado entra como 'Pendente'
       const statusValidos = ['Pendente', 'Preparando', 'Pronto', 'Concluido'];
       return pTime >= start && statusValidos.includes(p.status);
    });

    let total = 0;
    let dinheiro = 0;
    let pix = 0;
    let cartao = 0;

    vendasPeriodo.forEach(v => {
      const vValor = Number(v.valor) || 0;
      total += vValor;
      const fp = String(v.formaPagamento || '').toLowerCase();
      if (fp.includes('dinheiro')) dinheiro += vValor;
      else if (fp.includes('pix')) pix += vValor;
      else cartao += vValor;
    });

    pedidosPeriodo.forEach(p => {
      const pTotal = Number(p.total) || 0;
      total += pTotal;
      const fp = String(p.formaPagamento || '').toLowerCase();
      if (fp.includes('dinheiro')) dinheiro += pTotal;
      else if (fp.includes('pix')) pix += pTotal;
      else cartao += pTotal;
    });

    return { total, dinheiro, pix, cartao };
  };

  const stats = getFaturamentoPeriodo();

  if (loading) {
    return (
      <div className="p-20 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block">
          <DollarSign size={40} className="text-blue-600" />
        </motion.div>
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando Fluxo de Caixa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Fluxo de Caixa</h2>
          <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">Controle de Turnos e Recebíveis</p>
        </div>
        <div className="flex items-center gap-3">
          {caixaStatus ? (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2 font-black text-xs uppercase animate-pulse">
              <Unlock size={14} />
              Caixa em Operação
            </div>
          ) : (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full flex items-center gap-2 font-black text-xs uppercase">
              <Lock size={14} />
              Caixa Fechado
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!caixaStatus ? (
          <motion.div 
            key="caixa-fechado"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white p-10 rounded-[2.5rem] border-4 border-gray-100 shadow-xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <DollarSign size={120} />
              </div>

              <div className="text-center space-y-2">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator size={40} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Abertura de Turno</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">Inicie um novo período de vendas informando o saldo inicial da gaveta.</p>
              </div>

              <form onSubmit={handleAbrirCaixa} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Saldo Inicial (Dinheiro)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={valorInicial}
                        onChange={(e) => setValorInicial(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none transition-all font-black text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Autorizado por (Admin)</label>
                    <input 
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Usuário Admin"
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none transition-all font-black text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Confirme a Senha Admin</label>
                  <input 
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none transition-all font-black text-gray-900"
                    required
                  />
                </div>

                <button 
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-3"
                >
                  {actionLoading ? "Processando..." : (
                    <>
                      Iniciar Operações
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="caixa-aberto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Resumo Financeiro do Período */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Resumo Financeiro em Tempo Real</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase">Período: {new Date(caixaStatus.dataAbertura).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Sessão Ativa</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Inicial</p>
                    <p className="text-lg font-black text-gray-900">R$ {Number(caixaStatus.valorInicial).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Em Dinheiro</p>
                    <p className="text-lg font-black text-green-700">R$ {stats.dinheiro.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Em Pix</p>
                    <p className="text-lg font-black text-blue-700">R$ {stats.pix.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Cartões</p>
                    <p className="text-lg font-black text-purple-700">R$ {stats.cartao.toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-gray-900 p-8 rounded-3xl text-white relative overflow-hidden">
                   <div className="relative z-10">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Movimentado (Turno)</p>
                    <p className="text-4xl font-black tracking-tighter">R$ {(Number(caixaStatus.valorInicial) + stats.total).toFixed(2)}</p>
                   </div>
                   <div className="absolute right-0 bottom-0 p-4 opacity-10">
                     <TrendingUp size={120} />
                   </div>
                </div>

                <div className="pt-4 flex items-center gap-4 text-xs font-bold text-gray-400 uppercase">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                     Integrado com PDV
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                     Pedidos QR Code ativos
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     Garçom em tempo real
                   </div>
                </div>
              </div>
              
              {/* Detalhes do Turno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-5">
                  <div className="bg-gray-100 w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador Responsável</p>
                    <p className="text-lg font-black text-gray-900">{caixaStatus.userName}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-5">
                  <div className="bg-gray-100 w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Decorrido</p>
                    <p className="text-lg font-black text-gray-900">
                      {Math.floor((Date.now() - caixaStatus.dataAbertura) / (1000 * 60 * 60))}h {Math.floor(((Date.now() - caixaStatus.dataAbertura) / (1000 * 60)) % 60)}min
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna de Fechamento */}
            <div className="space-y-6">
               <div className="bg-white p-8 rounded-3xl border-4 border-gray-100 shadow-sm space-y-6">
                  <div className="text-center space-y-1">
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Encerramento</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">Conferência de Valores</p>
                  </div>

                  <form onSubmit={handleFecharCaixa} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Dinheiro em Caixa (Final)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={valorFinal}
                          onChange={(e) => setValorFinal(e.target.value)}
                          placeholder="Contagem física"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl outline-none transition-all font-black text-gray-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Observações / Sangrias / Suprimentos</label>
                      <textarea 
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Relate divergências ou sangrias..."
                        rows={4}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl outline-none transition-all font-bold text-gray-700 text-sm resize-none"
                      />
                    </div>

                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                       <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1 text-center">Expectativa Dinheiro</p>
                       <p className="text-2xl font-black text-red-900 text-center">R$ {(Number(caixaStatus.valorInicial) + stats.dinheiro).toFixed(2)}</p>
                    </div>

                    <button 
                      disabled={actionLoading}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-red-200 flex items-center justify-center gap-3"
                    >
                      {actionLoading ? "Fechando..." : "Encerrar Caixa"}
                    </button>
                  </form>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Histórico */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <History className="text-gray-400" size={20} />
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Histórico de Sessões</h3>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Abertura</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fechamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo Inicial</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo Final</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Relatório</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historico.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma sessão registrada anteiormente</td>
                </tr>
              ) : (
                historico.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-600 text-xs">{new Date(h.dataAbertura).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 text-xs">{h.dataFechamento ? new Date(h.dataFechamento).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 font-black text-gray-900 text-xs">{h.userName}</td>
                    <td className="px-6 py-4 text-right font-black text-gray-600 text-xs">R$ {Number(h.valorInicial).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-gray-900 text-xs">{h.valorFinal ? `R$ ${Number(h.valorFinal).toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        h.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedSession(h)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                        title="Ver Relatório Detalhado"
                      >
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedSession && (
          <SessionReportModal 
            session={selectedSession} 
            vendas={vendas} 
            pedidosOnline={pedidosOnline} 
            onClose={() => setSelectedSession(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
