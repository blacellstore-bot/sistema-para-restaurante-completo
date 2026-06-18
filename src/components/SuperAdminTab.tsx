import React, { useState, useEffect } from 'react';
import { 
  Trash2, Users, Building2, TrendingUp, Search, ShieldCheck, 
  Power, Plus, X, Globe, Mail, Lock, User as UserIcon, Pencil,
  BarChart3, LayoutDashboard, Settings, ExternalLink, AlertCircle,
  History as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../services/dataService';
import { User } from '../types';

interface SuperAdminTabProps {
  currentUser: User | null;
}

export default function SuperAdminTab({ currentUser }: SuperAdminTabProps) {
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
      'siteQr': true, 'entrega': true, 'porquinho': true, 'caixa': true, 'usuários': true, 
      'usuários de cozinha': true, 'promotor fiscal': true
    } as Record<string, boolean>
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
          'siteQr': true, 'entrega': true, 'porquinho': true, 'caixa': true, 'usuários': true, 
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
        'siteQr': true, 'entrega': true, 'porquinho': true, 'caixa': true, 'usuários': true, 
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

  if (loading && !tenants.length) {
    return (
      <div className="p-20 text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando painel master...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com Título */}
      <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Gestão Master SaaS</h2>
          <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">Controle Global de Clientes</p>
        </div>
        <button 
          onClick={loadData}
          className="p-3 text-gray-400 hover:text-blue-600 transition-colors"
          title="Atualizar Dados"
        >
          <HistoryIcon className="animate-pulse-slow" size={24} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600">
            <Building2 size={32} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresas</div>
            <div className="text-3xl font-black text-gray-900">{stats?.totalTenants || 0}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users size={32} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuários</div>
            <div className="text-3xl font-black text-gray-900">{stats?.totalUsers || 0}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-600">
            <TrendingUp size={32} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento Estimado</div>
            <div className="text-3xl font-black text-gray-900">R$ {Number(stats?.totalRevenue || 0).toLocaleString('pt-BR')}</div>
          </div>
        </motion.div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Clientes Cadastrados</h2>
            <p className="text-xs font-bold text-gray-400 mt-1">Gerencie acessos e status das empresas.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text"
                placeholder="Buscar por nome, ID ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 font-bold text-sm"
              />
              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
            </div>
            <button 
              onClick={() => {
                setEditingTenantId(null);
                setNewTenant({ name: '', slug: '', adminName: '', adminEmail: '', adminUsername: '', adminPassword: '', trialDays: 30 });
                setShowCreateModal(true);
              }}
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

      {/* Modals */}
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
                   <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Dados da Empresa</h4>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Fantasia</label>
                     <input type="text" required value={newTenant.name} onChange={(e) => setNewTenant({...newTenant, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: Burguer King" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">ID / Slug (8 dígitos)</label>
                     <input type="text" required disabled={!!editingTenantId} value={newTenant.slug} onChange={(e) => setNewTenant({...newTenant, slug: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: 88776655" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Adicionar Dias de Uso</label>
                     <input type="number" required value={newTenant.trialDays} onChange={(e) => setNewTenant({...newTenant, trialDays: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                     <p className="text-[9px] text-gray-400 mt-1 ml-1 leading-tight">Os dias serão adicionados a partir de hoje.</p>
                   </div>
                </div>
                <div className="space-y-6">
                   <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Dados do Administrador</h4>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                     <input type="text" required value={newTenant.adminName} onChange={(e) => setNewTenant({...newTenant, adminName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: João Silva" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail de Acesso</label>
                     <input type="email" required value={newTenant.adminEmail} onChange={(e) => setNewTenant({...newTenant, adminEmail: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="email@exemplo.com" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Usuário</label>
                       <input type="text" required value={newTenant.adminUsername} onChange={(e) => setNewTenant({...newTenant, adminUsername: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="admin" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
                       <input type="password" required={!editingTenantId} value={newTenant.adminPassword} onChange={(e) => setNewTenant({...newTenant, adminPassword: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder={editingTenantId ? "Opcional" : "mín 8 chars"} />
                     </div>
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

                {createError && (
                  <div className="col-span-2 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {createError}
                  </div>
                )}
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

const History = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);
