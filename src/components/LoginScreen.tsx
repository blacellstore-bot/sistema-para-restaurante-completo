import React, { useState } from 'react';
import { User as UserIcon, Lock, LogIn, UserPlus, Globe, ArrowLeft, Mail, Key, Info, X } from 'lucide-react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onGoToRegister: () => void;
  paymentStatus?: 'success' | 'cancel' | null;
}

type View = 'login' | 'forgot' | 'verify' | 'reset';

export default function LoginScreen({ onLogin, onGoToRegister, paymentStatus }: LoginScreenProps) {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('solvatv@gmail.com');
  const [password, setPassword] = useState('90909090');
  const [tenantId, setTenantId] = useState('915322');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string; dbHost?: string } | null>(null);
  const [showSuspension, setShowSuspension] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState<any>(null);

  React.useEffect(() => {
    dataService.getHealth()
      .then(res => {
        if (res.db !== 'connected') {
          setDbStatus({ connected: false, error: res.dbError });
        } else {
          setDbStatus({ connected: true });
        }
      })
      .catch(err => {
        setDbStatus({ connected: false, error: err.message });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalTenantId = tenantId.trim() || '915322';
    const finalUsername = username.trim() || 'solvatv@gmail.com';
    const finalPassword = password || '90909090';

    try {
      // Temporarily set tenantId to handle potential 403 subscription fetching
      dataService.setTenantId(finalTenantId);
      
      const res = await dataService.login({ 
        username: finalUsername, 
        password: finalPassword, 
        tenantId: finalTenantId 
      });
      if (res.success) {
        onLogin(res.user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle Suspension specifically
      if (err.suspended || (err.message && err.message.toLowerCase().includes('suspensa'))) {
        setSuspensionDetails({
          tenantId: err.tenantId || finalTenantId,
          tenantName: err.tenantName || 'Cliente',
          username: finalUsername
        });
        setShowSuspension(true);
      } 
      setError(err.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email || !tenantId) throw new Error('Preencha o e-mail e o ID da empresa');
      await dataService.forgotPassword(email, tenantId);
      setView('verify');
      setSuccess('Código enviado para o seu e-mail.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!code) throw new Error('Digite o código');
      await dataService.verifyResetCode(email, tenantId, code);
      setView('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await dataService.resetPassword({ email, tenantId, code, newPassword });
      setSuccess('Senha alterada com sucesso! Faça login agora.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-blue-600 p-8 text-center relative">
          {view !== 'login' && (
            <button 
              onClick={() => {
                setView('login');
                setError('');
                setSuccess('');
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {view === 'login' ? <UserIcon size={40} className="text-white" /> : <Key size={40} className="text-white" />}
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            {view === 'login' ? 'Acesso ao Sistema' : 
             view === 'forgot' ? 'Recuperar Senha' :
             view === 'verify' ? 'Verificar Código' : 'Nova Senha'}
          </h1>
          <p className="text-blue-100 text-sm mt-2">
            {view === 'login' ? 'Entre com suas credenciais para continuar' : 
             view === 'forgot' ? 'Enviaremos um código para o seu e-mail' :
             view === 'verify' ? 'Digite o código de 6 dígitos enviado' : 'Crie uma senha forte e segura'}
          </p>
        </div>

        <div className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          {dbStatus && !dbStatus.connected && (
            <div className="bg-red-100 text-red-700 p-4 rounded-xl text-xs font-bold border border-red-200 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="shrink-0" />
                <span>ERRO DE CONEXÃO COM O BANCO DE DADOS</span>
              </div>
              <p className="font-normal opacity-80">{dbStatus.error || 'Não foi possível conectar ao MySQL. Verifique suas variáveis de ambiente.'}</p>
              <div className="mt-2 p-2 bg-white/50 rounded border border-red-200 text-[10px] font-mono space-y-1">
                <p><strong>Host Atual:</strong> {dbStatus.dbHost}</p>
                <p>Dica: Na Hostinger, o DB_HOST geralmente é 'localhost' ou o IP fornecido no painel MySQL.</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-bold text-center border border-emerald-100">
              {success}
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ID da Empresa (Exatamente 8 Números)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="tenant_id"
                    autoComplete="organization"
                    maxLength={8}
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="ex: 12345678"
                  />
                  <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Usuário</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: admin"
                  />
                  <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Senha</label>
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="password" 
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Entrando...' : (
                  <>
                    <LogIn size={18} />
                    Acessar Painel
                  </>
                )}
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ID da Empresa (Apenas Números)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="ex: 123456"
                  />
                  <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">E-mail Cadastrado</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="seu@email.com"
                  />
                  <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </button>
            </form>
          )}

          {view === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Código de 6 Dígitos</label>
                <div className="relative">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-2xl tracking-[1em] py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nova Senha</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Alterando...' : 'Redefinir Senha'}
              </button>
            </form>
          )}

          {view === 'login' && (
            <div className="pt-4 border-t border-gray-100">
              <button 
                onClick={onGoToRegister}
                className="w-full py-3 bg-white text-gray-600 font-black uppercase tracking-widest text-xs rounded-xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                Criar Nova Empresa
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuspension && (
          <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl overflow-hidden max-w-lg w-full"
            >
              <div className="bg-red-600 p-10 text-center relative">
                <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                  <X size={54} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Acesso Bloqueado</h2>
                <p className="text-red-100 text-sm mt-3 font-bold uppercase tracking-wider">Sua conta está suspensa</p>
              </div>

              <div className="p-10 text-center space-y-8">
                <div className="space-y-2">
                  <p className="text-gray-600 font-bold leading-relaxed">
                    Olá <span className="text-red-600 font-black">{suspensionDetails?.tenantName}</span>, identificamos que sua conta ou a licença da sua empresa está suspensa no momento.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Para reativar seu acesso e continuar utilizando o sistema, entre em contato com nossa equipe de suporte.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações de Identificação</p>
                  <div className="flex justify-center gap-4 text-xs font-mono font-bold text-gray-700">
                    <span className="bg-white px-3 py-1 rounded-lg border border-gray-100">ID: {suspensionDetails?.tenantId}</span>
                    <span className="bg-white px-3 py-1 rounded-lg border border-gray-100">USUÁRIO: {suspensionDetails?.username}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      const adminWhatsApp = (import.meta as any).env.VITE_ADMIN_WHATSAPP || '5562994075417';
                      const message = `Olá equipe de suporte! Meu acesso foi BLOQUEADO.\n\nDados da Conta:\nEmpresa: ${suspensionDetails?.tenantName}\nID da Empresa: ${suspensionDetails?.tenantId}\nUsuário: ${suspensionDetails?.username}\n\nPreciso de ajuda para reativar meu acesso.`;
                      const encodedMessage = encodeURIComponent(message);
                      window.open(`https://wa.me/${adminWhatsApp.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
                    }}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 group"
                  >
                    <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    Falar com Suporte WhatsApp
                  </button>
                  <button 
                    onClick={() => setShowSuspension(false)}
                    className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                  >
                    Tentar outro login
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
