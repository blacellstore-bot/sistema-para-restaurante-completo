import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Venda, PedidoOnline } from '../types';

interface GraficosTabProps {
  vendas: Venda[];
  pedidosOnline: PedidoOnline[];
}

export default function GraficosTab({ vendas, pedidosOnline }: GraficosTabProps) {
  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const parseData = (str: string) => {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const filtrarPorPeriodo = (data: Date) => {
    data.setHours(0, 0, 0, 0);
    if (periodo === 'hoje') return data.getTime() === hoje.getTime();
    if (periodo === 'semana') {
      const diff = Math.ceil(Math.abs(hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    }
    if (periodo === 'mes') return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    if (periodo === 'ano') return data.getFullYear() === hoje.getFullYear();
    if (periodo === 'custom' && dataInicio && dataFim) {
      const start = new Date(dataInicio + 'T00:00:00');
      const end = new Date(dataFim + 'T23:59:59');
      return data >= start && data <= end;
    }
    return false;
  };

  let totalRecebido = 0;
  let totalAberto = 0;
  let pagamentos: Record<string, number> = { 'PIX': 0, 'Dinheiro': 0, 'Cartão': 0, 'Fiado Aberto': 0 };
  let origens: Record<string, number> = { 'Balcão': 0, 'QR Code': 0, 'Delivery': 0, 'Garçom': 0, 'Fiado': 0 };
  let itensTop: Record<string, number> = {};
  let garcomVendas: Record<string, number> = {};
  let garcomItens: Record<string, Record<string, number>> = {};

  const safeVendas = Array.isArray(vendas) ? vendas : [];
  const safePedidos = Array.isArray(pedidosOnline) ? pedidosOnline : [];

  safeVendas.forEach(v => {
    const d = parseData(v.data);
    if (filtrarPorPeriodo(d)) {
      const valor = Number(v.valor) || 0;
      if (v.pago) {
        totalRecebido += valor;
        const pag = v.formaPagamento || 'Outros';
        pagamentos[pag] = (pagamentos[pag] || 0) + valor;
      } else {
        totalAberto += valor;
        pagamentos['Fiado Aberto'] += valor;
      }
      // Adiciona ao gráfico de origens (Vendas diretas/Fiado)
      const oriDisplay = v.clienteId ? 'Fiado' : 'Balcão';
      origens[oriDisplay] = (origens[oriDisplay] || 0) + valor;
    }
  });

  safePedidos.forEach(p => {
    const d = new Date(p.timestamp || p.id);
    if (filtrarPorPeriodo(d)) {
      const total = Number(p.total) || 0;
      const isQrCode = p.origem === 'App' || p.origem === 'QR Code';

      if (p.origem !== 'Fiado') {
        // Consideramos 'Pronto' e 'Concluido' como Recebido
        if (['Pronto', 'Concluido'].includes(p.status)) {
          totalRecebido += total;
          const pag = p.formaPagamento || 'PIX';
          pagamentos[pag] = (pagamentos[pag] || 0) + total;

          // Stats por Garçom
          if (p.waiterId) {
            garcomVendas[p.waiterId] = (garcomVendas[p.waiterId] || 0) + total;
          }
        } 
        // 'Pendente' e 'Preparando' entram como 'A Receber' (Venda em andamento)
        // REGRA: Pedidos QR Code só aparecem quando Concluidos ou Prontos. Outros aparecem desde Pendente.
        else if (['Pendente', 'Preparando'].includes(p.status)) {
          if (!isQrCode) {
            totalAberto += total;
          }
        }
      }

      if (p.status !== 'Expirado' && p.status !== 'Cancelado') {
        // REGRA: Pedidos QR Code só aparecem no gráfico de origens quando Concluidos ou Prontos.
        if (isQrCode && !['Pronto', 'Concluido'].includes(p.status)) {
          return; // Pula este pedido para os gráficos
        }

        let oriDisplay = 'QR Code';
        const ori = p.origem;

        if (ori === 'Balcao') oriDisplay = 'Balcão';
        else if (['iFood', 'Uber Eats', 'Rappi', '99Food', 'Keeta'].includes(ori)) oriDisplay = 'Delivery';
        else if (ori === 'Garçom') oriDisplay = 'Garçom';
        else if (ori === 'Fiado') oriDisplay = 'Fiado';
        else oriDisplay = 'QR Code';

        // Agora somamos o VALOR, não apenas a contagem
        origens[oriDisplay] = (origens[oriDisplay] || 0) + total;

        if (Array.isArray(p.itens)) {
          p.itens.forEach(it => {
            itensTop[it.nome] = (itensTop[it.nome] || 0) + it.qtd;
            
            if (p.waiterId && p.status === 'Concluido') {
              if (!garcomItens[p.waiterId]) garcomItens[p.waiterId] = {};
              garcomItens[p.waiterId][it.nome] = (garcomItens[p.waiterId][it.nome] || 0) + it.qtd;
            }
          });
        }
      }
    }
  });

  const dataReceitas = [
    { name: 'Recebido', value: totalRecebido, fill: '#16a34a' },
    { name: 'A Receber', value: totalAberto, fill: '#dc2626' }
  ];

  const dataPagamentos = Object.entries(pagamentos)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const dataOrigens = Object.entries(origens)
    .map(([name, value]) => ({ name, value }));

  const dataItens = Object.entries(itensTop)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const dataGarcomVendas = Object.entries(garcomVendas)
    .map(([name, value]) => ({ name, value }));

  // Flatten garcomItens for a chart
  const dataGarcomItens: any[] = [];
  Object.entries(garcomItens).forEach(([waiterId, items]) => {
    Object.entries(items).forEach(([nome, qtd]) => {
      dataGarcomItens.push({ waiterId, nome, qtd });
    });
  });
  const topGarcomItens = dataGarcomItens.sort((a, b) => b.qtd - a.qtd).slice(0, 10);

  const COLORS = ['#0ea5e9', '#16a34a', '#f59e0b', '#94a3b8', '#8b5cf6'];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          {['hoje', 'semana', 'mes', 'ano'].map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                periodo === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 Dias' : p === 'mes' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
          <span className="text-xs font-bold text-gray-400 uppercase">Custom:</span>
          <input 
            type="date" 
            value={dataInicio}
            onChange={(e) => { setDataInicio(e.target.value); setPeriodo('custom'); }}
            className="p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">até</span>
          <input 
            type="date" 
            value={dataFim}
            onChange={(e) => { setDataFim(e.target.value); setPeriodo('custom'); }}
            className="p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border-l-8 border-green-500 p-8 rounded-2xl shadow-sm">
          <h3 className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">Total Recebido</h3>
          <p className="text-4xl font-black text-green-700">R$ {totalRecebido.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border-l-8 border-red-500 p-8 rounded-2xl shadow-sm">
          <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">A Receber</h3>
          <p className="text-4xl font-black text-red-700">R$ {totalAberto.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
          <h3 className="text-center font-bold text-gray-700 mb-6">Resumo Financeiro</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dataReceitas}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
          <h3 className="text-center font-bold text-gray-700 mb-6">Formas de Pagamento</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={dataPagamentos}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {dataPagamentos.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
          <h3 className="text-center font-bold text-gray-700 mb-6">Origem dos Pedidos</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={dataOrigens}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {dataOrigens.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
          <h3 className="text-center font-bold text-gray-700 mb-6">Pratos Mais Vendidos (Top 5)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dataItens} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
          <h3 className="text-center font-bold text-gray-700 mb-6">Vendas por Garçom</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dataGarcomVendas}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px] lg:col-span-2">
          <h3 className="text-center font-bold text-gray-700 mb-6">Top Pratos por Garçom</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={topGarcomItens} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="nome" type="category" width={150} />
              <Tooltip labelFormatter={(label, payload) => `Garçom: ${payload[0]?.payload?.waiterId}`} />
              <Bar dataKey="qtd" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
