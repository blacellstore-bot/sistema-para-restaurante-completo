import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, Users, Building2, TrendingUp, Search, ShieldAlert, ShieldCheck, 
  Power, Plus, X, Globe, Mail, Lock, User as UserIcon, Pencil, LogOut,
  BarChart3, LayoutDashboard, Settings, ExternalLink, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Configuração da API ---
const API_BASE_URL = '/api';

// --- Serviço de Dados (Adaptado para o Painel Standalone) ---
const dataService = {
  getHeaders: () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': 'system' // Sempre 'system' para o Super Admin
    };
    return headers;
  },

  handleResponse: async (res: Response) => {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro: ${res.status}`);
    }
    return res.json();
  },

  login: (credentials: any) => fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...credentials, tenantId: 'system' })
  }).then(dataService.handleResponse),

  getAdminTenants: () => fetch(`${API_BASE_URL}/admin/tenants`, { headers: dataService.getHeaders() }).then(dataService.handleResponse),
  getAdminStats: () => fetch(`${API_BASE_URL}/admin/stats`, { headers: dataService.getHeaders() }).then(dataService.handleResponse),
  updateTenantStatus: (id: string, active: boolean) => fetch(`${API_BASE_URL}/admin/tenants/${id}/status`, {
    method: 'PUT',
    headers: dataService.getHeaders(),
    body: JSON.stringify({ active })
  }).then(dataService.handleResponse),
  updateAdminTenant: (id: string, tenant: any) => fetch(`${API_BASE_URL}/admin/tenants/${id}`, {
    method: 'PUT',
    headers: dataService.getHeaders(),
    body: JSON.stringify(tenant)
  }).then(dataService.handleResponse),
  deleteAdminTenant: (id: string) => fetch(`${API_BASE_URL}/admin/tenants/${id}`, { 
    method: 'DELETE',
    headers: dataService.getHeaders()
  }).then(dataService.handleResponse),
  saveUser: (user: any) => fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: dataService.getHeaders(),
    body: JSON.stringify(user)
  }).then(dataService.handleResponse),
};

// --- Componente Principal do App ---
export default function SuperAdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('superAdminToken') === 'true');
  const [user, setUser] = useState<any>(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    trialDays: 30,
    permissions: {
      'cartão': true, 'cadastro': true, 'irmão': true, 'fazerOrdem': true, 
      'pedidosQr': true, 'baixaCozinha': true, 'relacional': true, 'gráficos': true, 
      'configurar': true, 'estoque': true, 'painelCliente': true, 'gmeas': true, 
      'siteQr': true, 'entrega': true, 'porquinho': true, 'usuários': true, 
      'usuários de cozinha': true, 'promotor fiscal': true
    } as Record<string, boolean>
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([
        dataService.getAdminTenants(),
        dataService.getAdminStats()
      ]);
      setTenants(t);
      setStats(s);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await dataService.login(loginData);
      if (res.success && res.user.role === 'superadmin') {
        setIsLoggedIn(true);
        setUser(res.user);
        localStorage.setItem('superAdminToken', 'true');
      } else {
        setLoginError('Acesso negado. Apenas Super Admins podem acessar este painel.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Usuário ou senha incorretos');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('superAdminToken');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      if (editingTenantId) {
        await dataService.updateAdminTenant(editingTenantId, {
          name: newTenant.name,
          adminName: newTenant.adminName,
          adminEmail: newTenant.adminEmail,
          adminUsername: newTenant.adminUsername,
          adminPassword: newTenant.adminPassword,
          trialDays: Number(newTenant.trialDays),
          permissions: newTenant.permissions
        });
      } else {
        const userData = {
          id: Date.now().toString(),
          username: newTenant.adminUsername,
          password: newTenant.adminPassword,
          name: newTenant.adminName,
          email: newTenant.adminEmail,
          role: 'admin',
          permissions: newTenant.permissions,
          isNewTenant: true,
          tenantName: newTenant.name,
          tenantId: newTenant.slug,
          trialDays: Number(newTenant.trialDays)
        };
        await dataService.saveUser(userData);
      }

      setShowCreateModal(false);
      setEditingTenantId(null);
      setNewTenant({
        name: '', slug: '', adminName: '', adminEmail: '', adminUsername: '', adminPassword: '', trialDays: 30,
        permissions: {
          'cartão': true, 'cadastro': true, 'irmão': true, 'fazerOrdem': true, 
          'pedidosQr': true, 'baixaCozinha': true, 'relacional': true, 'gráficos': true, 
          'configurar': true, 'estoque': true, 'painelCliente': true, 'gmeas': true, 
          'siteQr': true, 'entrega': true, 'porquinho': true, 'usuários': true, 
          'usuários de cozinha': true, 'promotor fiscal': true
        }
      });
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao salvar empresa');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClick = (tenant: any) => {
    let perms = tenant.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
    }

    setEditingTenantId(tenant.id);
    setNewTenant({
      name: tenant.name,
      slug: tenant.id,
      adminName: tenant.admin_name || '',
      adminEmail: tenant.email || '',
      adminUsername: tenant.username || '',
      adminPassword: '',
      trialDays: 30,
      permissions: perms || {
        'cartão': true, 'cadastro': true, 'irmão': true, 'fazerOrdem': true, 
        'pedidosQr': true, 'baixaCozinha': true, 'relacional': true, 'gráficos': true, 
        'configurar': true, 'estoque': true, 'painelCliente': true, 'gmeas': true, 
        'siteQr': true, 'entrega': true, 'porquinho': true, 'usuários': true, 
        'usuários de cozinha': true, 'promotor fiscal': true
      }
    });
    setShowCreateModal(true);
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a empresa "${name}"? Todos os dados vinculados serão APAGADOS permanentEMENTE.`)) {
      return;
    }
    try {
      await dataService.deleteAdminTenant(id);
      loadData();
    } catch (err) {
      alert('Erro ao excluir empresa');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await dataService.updateTenantStatus(id, !currentStatus);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, active: !currentStatus } : t));
    } catch (err) {
      alert('Erro ao alterar status da empresa');
    }
  };

  const filteredTenants = Array.isArray(tenants) ? tenants.filter(t => 
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-800"
        >
          <div className="bg-blue-600 p-10 text-center relative">
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldAlert size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Super Admin</h1>
            <p className="text-blue-100 font-bold text-xs mt-2 uppercase tracking-widest">Painel de Controle SaaS</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário Mestre</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                  placeholder="admin"
                />
                <UserIcon className="absolute left-4 top-4 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-4 text-gray-400" size={20} />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-tighter disabled:opacity-50"
            >
              {loginLoading ? 'Verificando...' : 'Entrar no Painel'}
            </button>
            
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Acesso restrito ao administrador do sistema
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">SaaS Manager</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Painel Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600">
              <Building2 size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresas</div>
              <div className="text-3xl font-black text-gray-900">{stats?.totalTenants || 0}</div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuários</div>
              <div className="text-3xl font-black text-gray-900">{stats?.totalUsers || 0}</div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-600">
              <TrendingUp size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento</div>
              <div className="text-3xl font-black text-gray-900">R$ {Number(stats?.totalRevenue || 0).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestão de Clientes</h2>
              <p className="text-xs font-bold text-gray-400 mt-1">Gerencie acessos e status das empresas.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 font-bold text-sm"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-blue-100 transition-all"
              >
                <Plus size={18} />
                Nova Empresa
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa</th>
                  <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Slug</th>
                  <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-10 py-6">
                      <div className="font-black text-gray-900 text-lg leading-none mb-1">{tenant.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{tenant.email || 'Sem e-mail'}</div>
                    </td>
                    <td className="px-10 py-6">
                      <code className="bg-blue-50 px-3 py-1.5 rounded-xl text-[11px] text-blue-600 font-black">{tenant.id}</code>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <button
                        onClick={() => handleToggleStatus(tenant.id, tenant.active)}
                        disabled={tenant.id === 'system'}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 mx-auto ${
                          tenant.active 
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        } ${tenant.id === 'system' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${tenant.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {tenant.active ? 'Ativo' : 'Suspenso'}
                      </button>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleEditClick(tenant)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Pencil size={20} /></button>
                        <button 
                          onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                          disabled={tenant.id === 'system'}
                          className={`p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all ${tenant.id === 'system' ? 'opacity-20' : ''}`}
                        ><Trash2 size={20} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden">
              <div className="bg-blue-600 p-10 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Building2 size={32} />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">
                    {editingTenantId ? 'Editar Empresa' : 'Nova Empresa'}
                  </h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="hover:bg-white/20 p-3 rounded-2xl transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleCreateTenant} className="p-10 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                   <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Empresa</h4>
                   <input type="text" required value={newTenant.name} onChange={(e) => setNewTenant({...newTenant, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Nome da Empresa" />
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">ID (8 dígitos)</label>
                     <input type="text" required disabled={!!editingTenantId} value={newTenant.slug} onChange={(e) => setNewTenant({...newTenant, slug: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="ID (8 dígitos)" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Adicionar Dias de Uso</label>
                     <input type="number" required value={newTenant.trialDays} onChange={(e) => setNewTenant({...newTenant, trialDays: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                   </div>
                </div>
                <div className="space-y-6">
                   <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Admin</h4>
                   <input type="text" required value={newTenant.adminName} onChange={(e) => setNewTenant({...newTenant, adminName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Nome do Admin" />
                   <input type="email" required value={newTenant.adminEmail} onChange={(e) => setNewTenant({...newTenant, adminEmail: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="E-mail" />
                   <div className="grid grid-cols-2 gap-4">
                     <input type="text" required value={newTenant.adminUsername} onChange={(e) => setNewTenant({...newTenant, adminUsername: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="User" />
                     <input type="password" required={!editingTenantId} value={newTenant.adminPassword} onChange={(e) => setNewTenant({...newTenant, adminPassword: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Senha" />
                   </div>
                </div>
                <div className="col-span-2 space-y-4">
                   <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest border-b border-purple-50 pb-2">Abas de Acesso</h4>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {Object.keys(newTenant.permissions).map((tabId) => (
                       <label key={tabId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent has-[:checked]:border-purple-200 has-[:checked]:bg-purple-50">
                         <input 
                           type="checkbox" 
                           checked={newTenant.permissions[tabId]} 
                           onChange={(e) => setNewTenant({
                             ...newTenant, 
                             permissions: { ...newTenant.permissions, [tabId]: e.target.checked }
                           })}
                           className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                         />
                         <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{tabId}</span>
                       </label>
                     ))}
                   </div>
                </div>
                <div className="col-span-2 flex gap-4 mt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" disabled={createLoading} className="flex-1 py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all">{createLoading ? 'Salvando...' : 'Confirmar'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
