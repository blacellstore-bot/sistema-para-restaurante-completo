import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Trash2, Key, User as UserIcon, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { User } from '../types';
import { dataService } from '../services/dataService';

interface KitchenUsersTabProps {
  users: User[];
  setUsers: (users: User[]) => void;
  config: any;
  setConfig: (config: any) => void;
}

export default function KitchenUsersTab({ users, setUsers, config, setConfig }: KitchenUsersTabProps) {
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleSkipStart = async () => {
    if (!config) return;
    const newStatus = !config.kitchen_skip_start;
    try {
      await dataService.saveConfig({ ...config, kitchen_skip_start: newStatus });
      setConfig({ ...config, kitchen_skip_start: newStatus });
    } catch (err) {
      alert("Erro ao salvar configuração");
    }
  };

  const cooks = users.filter(u => u.role === 'cook');

  const handleAddCook = async () => {
    if (!newName || !newCode) {
      alert("Preencha o nome e o código!");
      return;
    }

    if (newCode.length < 4) {
      alert("O código deve ter pelo menos 4 dígitos!");
      return;
    }

    // Check if code is unique within the tenant
    if (users.some(u => u.kitchenCode === newCode)) {
      alert("Este código já está em uso!");
      return;
    }

    setLoading(true);
    try {
      const newUser: User = {
        id: Date.now().toString(),
        name: newName,
        username: `cook_${Date.now()}`, // Internal username
        password: Math.random().toString(36).slice(-8), // Dummy password
        role: 'cook',
        permissions: {}, // Cooks don't log in to the main dashboard
        kitchenCode: newCode
      };

      const response = await dataService.saveUser(newUser);
      if (response.success) {
        const userWithId = { ...newUser, id: response.id || newUser.id };
        setUsers([...users, userWithId]);
        setNewName('');
        setNewCode('');
        alert("Cozinheiro cadastrado com sucesso!");
      }
    } catch (err) {
      alert("Erro ao cadastrar cozinheiro");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cozinheiro?")) return;
    
    try {
      await dataService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert("Erro ao excluir cozinheiro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 border-4 border-gray-100 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Gestão de Cozinheiros</h2>
              <p className="text-gray-500 font-bold text-sm">Cadastre os códigos de acesso para a cozinha</p>
            </div>
          </div>

          {config && (
            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Modo Simplificado</p>
                <p className="text-[10px] text-gray-500 font-bold">Pular etapa "Iniciar Pedido"</p>
              </div>
              <button 
                onClick={handleToggleSkipStart}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  config.kitchen_skip_start 
                    ? 'bg-green-100 text-green-600 border-2 border-green-200' 
                    : 'bg-gray-200 text-gray-400 border-2 border-gray-300'
                }`}
              >
                {config.kitchen_skip_start ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                {config.kitchen_skip_start ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nome do Cozinheiro</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none font-bold transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Código de Acesso (4+ dígitos)</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1234"
                maxLength={8}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-transparent focus:border-orange-500 outline-none font-bold transition-all"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddCook}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus size={20} />
              <span className="uppercase tracking-widest text-xs">Cadastrar Código</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cooks.map(cook => (
          <div key={cook.id} className="bg-white rounded-[2.5rem] p-6 border-4 border-gray-50 shadow-xl hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                <ChefHat size={28} />
              </div>
              <button
                onClick={() => handleDelete(cook.id)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{cook.name}</h3>
              <div className="flex items-center gap-2 text-orange-600 font-black">
                <Key size={14} />
                <span className="text-sm tracking-widest">CÓDIGO: {cook.kitchenCode}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-gray-50 flex items-center justify-between">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Ativo</span>
              </div>
            </div>
          </div>
        ))}

        {cooks.length === 0 && (
          <div className="col-span-full bg-gray-50 rounded-[2.5rem] p-12 text-center border-4 border-dashed border-gray-200">
            <ChefHat size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">Nenhum cozinheiro cadastrado</h3>
            <p className="text-gray-400 font-bold text-sm">Cadastre os códigos acima para permitir o uso da cozinha</p>
          </div>
        )}
      </div>
    </div>
  );
}
