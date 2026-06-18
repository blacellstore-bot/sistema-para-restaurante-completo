import React, { useState } from 'react';
import { UserPlus, Trash2, Shield, ShieldCheck, History, Clock, CheckCircle2, User as UserIcon, Search, Pencil, X } from 'lucide-react';
import { User, PedidoOnline } from '../types';
import { dataService } from '../services/dataService';

interface UsuariosTabProps {
  users: User[];
  setUsers: (users: User[]) => void;
  tabs: { id: string, label: string }[];
  pedidosOnline: PedidoOnline[];
}

export default function UsuariosTab({ users, setUsers, tabs, pedidosOnline }: UsuariosTabProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({ cartão: true });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});

  const safeUsers = Array.isArray(users) ? users : [];
  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const safePedidos = Array.isArray(pedidosOnline) ? pedidosOnline : [];

  // Filter activities (last 20)
  const activities = [...safePedidos]
    .filter(p => p.cookStartedId || p.cookFinishedId || p.paymentWaiterId)
    .filter(p => !searchTerm || p.codigoComanda?.toString().includes(searchTerm))
    .sort((a, b) => (b.horaConclusao || b.timestamp) - (a.horaConclusao || a.timestamp))
    .slice(0, 20);

  const handleAddUser = () => {
    if (!name || !username || !password) {
      alert('Preencha todos os campos (Senha é obrigatória para novos usuários)');
      return;
    }
    if (safeUsers.find(u => u.username === username)) {
      alert('Este usuário já existe');
      return;
    }

    const newUser: any = {
      id: Date.now().toString(),
      name,
      username,
      password,
      role: 'user',
      permissions: selectedPermissions
    };

    dataService.saveUser(newUser)
      .then((response) => {
        if (response.success) {
          const userWithId = { ...newUser, id: response.id || newUser.id };
          setUsers([...safeUsers, userWithId]);
          setName(''); setUsername(''); setPassword(''); setSelectedPermissions({ cartão: true });
          alert('Usuário criado com sucesso!');
        }
      })
      .catch(err => {
        console.error('Erro ao salvar usuário:', err);
        alert('Erro ao salvar usuário: ' + err.message);
      });
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword(''); // Don't show hashed password
    setEditPermissions(user.permissions || {});
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editName || !editUsername) {
      alert('Nome e Usuário são obrigatórios');
      return;
    }

    try {
      const updatedData: any = {
        name: editName,
        username: editUsername,
        permissions: editPermissions
      };

      // Only include password if it was changed
      if (editPassword) {
        updatedData.password = editPassword;
      }

      await dataService.updateUser(editingUser.id, updatedData);
      
      setUsers(safeUsers.map(u => u.id === editingUser.id ? { ...u, ...updatedData } : u));
      setEditingUser(null);
      alert('Usuário atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      alert('Erro ao atualizar usuário: ' + err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await dataService.deleteUser(id);
      setUsers(safeUsers.filter(u => u.id !== id));
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      alert('Erro ao excluir usuário');
    }
  };

  const togglePermission = (tabId: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditPermissions(prev => ({
        ...prev,
        [tabId]: !prev[tabId]
      }));
    } else {
      setSelectedPermissions(prev => ({
        ...prev,
        [tabId]: !prev[tabId]
      }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de Criação */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <UserPlus className="text-blue-600" />
            Novo Usuário / Funcionário
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nome do Funcionário</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Usuário de Login</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: joao.vendas"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Senha</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Permissões de Acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {safeTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => togglePermission(tab.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-bold ${
                    selectedPermissions[tab.id] === true
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}
                >
                  {selectedPermissions[tab.id] === true ? <ShieldCheck size={16} /> : <Shield size={16} />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleAddUser}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all"
          >
            Criar Funcionário
          </button>
        </div>

        {/* Lista de Usuários */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-gray-800">Usuários Ativos</h3>
          <div className="space-y-3">
            {safeUsers.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white ${
                    user.role === 'admin' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}>
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {user.name}
                      {user.role === 'admin' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Admin</span>}
                      {user.role === 'cook' && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Cozinha</span>}
                      {user.role === 'waiter' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Garçom</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.role === 'cook' ? `Código: ${user.kitchenCode}` : `@${user.username}`} • {Object.values(user.permissions || {}).filter(Boolean).length} abas
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role !== 'admin' && (
                    <>
                      <button 
                        onClick={() => handleStartEdit(user)}
                        className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Editar Usuário"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico de Atividades */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <History className="text-indigo-600" />
            Histórico de Atividades (Pedidos)
          </h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Pedido</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cozinha (Início)</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cozinha (Fim)</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Pagamento (Garçom)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((p, idx) => (
                <tr key={`${p.id}-${p.timestamp}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">#{p.codigoComanda}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-black">
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    {p.cookStartedName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-[10px] font-black">
                          {p.cookStartedName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700">{p.cookStartedName}</div>
                          <div className="text-[10px] text-gray-400">Iniciou preparo</div>
                        </div>
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="p-4">
                    {p.cookFinishedName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                          {p.cookFinishedName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700">{p.cookFinishedName}</div>
                          <div className="text-[10px] text-gray-400">Concluiu pedido</div>
                        </div>
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="p-4">
                    {p.paymentWaiterName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                          {p.paymentWaiterName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700">{p.paymentWaiterName}</div>
                          <div className="text-[10px] text-gray-400">Recebeu R$ {Number(p.total || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhuma atividade registrada ainda</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Pencil className="text-blue-600" />
                Editar Usuário: {editingUser.name}
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Usuário de Login</label>
                  <input 
                    type="text" 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nova Senha (deixe em branco para não alterar)</label>
                  <input 
                    type="password" 
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Permissões de Acesso</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {safeTabs.map(tab => (
                      <button
                        key={`edit-perm-${tab.id}`}
                        onClick={() => togglePermission(tab.id, true)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-bold ${
                          editPermissions[tab.id] === true
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-gray-50 border-gray-100 text-gray-400"
                        }`}
                      >
                        {editPermissions[tab.id] === true ? <ShieldCheck size={16} /> : <Shield size={16} />}
                        {tab.label}
                      </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setEditingUser(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateUser}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-4 rounded-xl shadow-lg transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
