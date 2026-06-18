import React, { useState } from 'react';
import { Calendar, Clock, Users, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Mesa, Reserva } from '../types';

interface ReservaTabProps {
  mesas: Mesa[];
  reservas: Reserva[];
  onSaveReserva: (reserva: Partial<Reserva>) => Promise<void>;
  onDeleteReserva: (id: number) => Promise<void>;
}

export default function ReservaTab({ mesas, reservas, onSaveReserva, onDeleteReserva }: ReservaTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Reserva>>({
    mesaId: undefined,
    clienteNome: '',
    data: new Date().toISOString().split('T')[0],
    hora: '',
    pessoas: 2,
    status: 'pendente',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mesaId || !formData.clienteNome || !formData.data || !formData.hora) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Check for duplicate reservation (same table, same date, same time)
    const conflict = reservas.find(r => 
      r.mesaId === formData.mesaId && 
      r.data === formData.data && 
      r.hora === formData.hora &&
      r.status !== 'cancelada'
    );

    if (conflict) {
      alert(`Atenção: A mesa selecionada já possui uma reserva para este dia (${formData.data}) às ${formData.hora}. Por favor, escolha outro horário ou mesa.`);
      return;
    }

    await onSaveReserva(formData);
    setIsAdding(false);
    setFormData({
      mesaId: undefined,
      clienteNome: '',
      data: new Date().toISOString().split('T')[0],
      hora: '',
      pessoas: 2,
      status: 'pendente',
      observacoes: ''
    });
  };

  const getStatusBadge = (status: Reserva['status']) => {
    switch (status) {
      case 'pendente':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase">Pendente</span>;
      case 'confirmada':
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase">Confirmada</span>;
      case 'cancelada':
        return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black uppercase">Cancelada</span>;
      case 'finalizada':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">Finalizada</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Reservas de Mesas 📅</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gerencie a agenda do seu restaurante</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
        >
          <Plus size={20} />
          Nova Reserva
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mesa</label>
              <select 
                value={formData.mesaId || ''}
                onChange={(e) => setFormData({ ...formData, mesaId: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                required
              >
                <option value="">Selecione a Mesa</option>
                {mesas.map(m => (
                  <option key={m.id} value={m.id}>{m.numero}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</label>
              <input 
                type="text" 
                value={formData.clienteNome}
                onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                placeholder="Nome do cliente"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
              <input 
                type="date" 
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hora</label>
              <input 
                type="time" 
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pessoas</label>
              <input 
                type="number" 
                value={formData.pessoas}
                onChange={(e) => setFormData({ ...formData, pessoas: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</label>
              <textarea 
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas internas, restrições, etc."
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold min-h-[100px]"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                Salvar Reserva
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesa</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Pessoas</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {reservas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-gray-400">
                      <Calendar size={48} className="opacity-20" />
                      <span className="font-bold text-lg italic">Nenhuma reserva encontrada.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                reservas.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                          {r.mesaNumero}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-900">{r.clienteNome}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px]">{r.observacoes || 'Sem obs'}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-gray-700">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-300" /> {r.data.split('-').reverse().join('/')}</span>
                        <span className="flex items-center gap-1"><Clock size={14} className="text-gray-300" /> {r.hora}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1 font-bold text-gray-700">
                        <Users size={16} className="text-gray-300" />
                        {r.pessoas}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        {r.status === 'pendente' && (
                          <button 
                            onClick={() => onSaveReserva({ ...r, status: 'confirmada' })}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Confirmar"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {r.status === 'confirmada' && (
                          <button 
                            onClick={() => onSaveReserva({ ...r, status: 'finalizada' })}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Finalizar"
                          >
                            <AlertCircle size={18} />
                          </button>
                        )}
                        {r.status !== 'cancelada' && (
                          <button 
                            onClick={() => onSaveReserva({ ...r, status: 'cancelada' })}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (confirm('Deseja realmente excluir esta reserva?')) {
                              onDeleteReserva(r.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
