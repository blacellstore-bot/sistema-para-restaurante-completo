import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Trash2, Edit3, Plus, Eye, X } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Mesa } from '../types';

interface QRCodeMesasTabProps {
  mesas: Mesa[];
  onSaveMesa: (mesa: Partial<Mesa>) => Promise<void>;
  onDeleteMesa: (id: number) => Promise<void>;
}

export default function QRCodeMesasTab({ mesas, onSaveMesa, onDeleteMesa }: QRCodeMesasTabProps) {
  const [mesa, setMesa] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingMesa, setViewingMesa] = useState<Mesa | null>(null);
  const [menuCode, setMenuCode] = useState<string>('');

  useEffect(() => {
    dataService.getSubscription().then(sub => {
      setMenuCode(sub.menuCode || localStorage.getItem('tenant_id') || '');
    }).catch(() => {
      setMenuCode(localStorage.getItem('tenant_id') || '');
    });
  }, []);

  const generateLink = (numeroMesa: string) => {
    const appUrl = 'https://restaurantesistema.com';
    return `${appUrl}/menu/${menuCode}/${encodeURIComponent(numeroMesa)}`;
  };

  const generateQrUrl = (numeroMesa: string) => {
    const link = generateLink(numeroMesa);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;
  };

  const handleSave = async () => {
    if (!mesa) return;

    // Check if table number already exists (excluding the one we're editing)
    const exists = mesas.some(m => m.numero.toLowerCase() === mesa.toLowerCase() && m.id !== editingId);
    if (exists) {
      alert(`O número de mesa "${mesa}" já existe. Por favor, escolha outro.`);
      return;
    }

    const qrUrl = generateQrUrl(mesa);
    await onSaveMesa({
      id: editingId || undefined,
      numero: mesa,
      qrCode: qrUrl
    });

    setMesa('');
    setEditingId(null);
  };

  const handleEdit = (m: Mesa) => {
    setMesa(m.numero);
    setEditingId(m.id);
  };

  const handleCancelEdit = () => {
    setMesa('');
    setEditingId(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-amber-800 tracking-tighter uppercase">Gestão de QR Code Mesas 🔳</h2>
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Organize as mesas do seu restaurante e gere códigos de acesso</p>
      </div>

      <div className="bg-amber-50 p-8 rounded-[32px] border-2 border-amber-100 shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex-grow">
          <label className="block text-[10px] font-black text-amber-800 mb-2 uppercase tracking-widest">Identificação da Mesa</label>
          <input 
            type="text" 
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            placeholder="Ex: Mesa 01"
            className="w-full p-4 border-2 border-amber-200 rounded-2xl outline-none focus:border-amber-500 font-black text-xl placeholder:text-amber-200 placeholder:font-bold"
          />
        </div>
        <div className="flex gap-2">
          {editingId ? (
            <>
              <button 
                onClick={handleCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-600 font-black px-6 py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
              >
                Atualizar
              </button>
            </>
          ) : (
            <button 
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <Plus size={20} />
              Adicionar Mesa
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mesas.map((m) => (
          <div key={m.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl">
                  {m.numero}
                </div>
                <div>
                   <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">{m.numero}</h3>
                   <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">QR Code Ativo</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setViewingMesa(m)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ver QR Code"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(m)}
                  className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Excluir a ${m.numero}?`)) {
                      onDeleteMesa(m.id);
                    }
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex justify-center py-4">
              <div className="relative group/qr p-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 group-hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setViewingMesa(m)}>
                <img 
                  src={m.qrCode || generateQrUrl(m.numero)} 
                  alt={`QR ${m.numero}`} 
                  className="w-32 h-32 rounded-xl grayscale group-hover:grayscale-0 transition-all opacity-50 group-hover:opacity-100"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 opacity-0 group-hover/qr:opacity-100 transition-opacity">
                  <Eye size={24} className="text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="text-[8px] text-gray-300 font-mono text-center truncate px-4">
              {generateLink(m.numero)}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Visualização QR Code */}
      {viewingMesa && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setViewingMesa(null)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <button 
              onClick={() => setViewingMesa(null)}
              className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <div className="p-10 text-center space-y-8">
              <div className="space-y-2">
                <h2 className="text-6xl font-black text-gray-900 uppercase tracking-tighter">{viewingMesa.numero}</h2>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Menu Digital & Pedidos</p>
              </div>

              <div className="relative inline-block group">
                <div className="absolute -inset-8 bg-amber-100 rounded-[60px] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <img 
                  src={viewingMesa.qrCode || generateQrUrl(viewingMesa.numero)} 
                  alt="QR Code" 
                  className="relative w-80 h-80 border-[20px] border-white rounded-[60px] shadow-2xl"
                />
              </div>

              <p className="text-gray-500 font-medium text-lg max-w-xs mx-auto">
                Aponte a câmera do celular para este código para ver o cardápio e fazer seu pedido.
              </p>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-900 hover:bg-black text-white font-black px-10 py-5 rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                >
                  <Printer size={24} />
                  Imprimir Código
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
