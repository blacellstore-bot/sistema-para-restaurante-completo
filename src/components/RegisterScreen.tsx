import React, { useState } from 'react';
import { User as UserIcon, Globe, UserPlus, ArrowLeft, Mail, Phone, Lock, Info, Search, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';

interface RegisterScreenProps {
  onRegisterAdmin: (user: User) => void;
  onBack: () => void;
}

export default function RegisterScreen({ onRegisterAdmin, onBack }: RegisterScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string } | null>(null);

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

  React.useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleConsultarCNPJ = async () => {
    const limpo = cnpj.replace(/\D/g, '');
    if (limpo.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      return;
    }

    setLoadingCnpj(true);
    setError('');
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (response.ok) {
        const data = await response.json();
        setTenantName(data.razao_social || data.nome_fantasia);
        if (data.ddd_telefone_1) {
          setWhatsapp(data.ddd_telefone_1.replace(/\D/g, ''));
        }
      } else {
        setError('CNPJ não encontrado ou erro na Brasil API');
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      setError('Erro ao conectar com a Brasil API');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trialDays = 30; // Sempre 30 dias de trial
    setError('');
    setLoading(true);

    try {
      if (!username || !password || !name || !tenantId || !tenantName || !email || !emailConfirm || !whatsapp) {
        setError('Preencha todos os campos');
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (email !== emailConfirm) {
        setError('Os e-mails digitados não coincidem');
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const specialChars = /[!@#$%^&*(),.?":{}|<>]/;
      if (password.length < 8 || !specialChars.test(password)) {
        setError('A senha deve ter no mínimo 8 caracteres e um caractere especial');
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const newUser: any = {
        id: Date.now().toString(),
        username,
        password,
        name,
        email,
        whatsapp,
        role: 'admin',
        permissions: {
          'cartão': true, 'cadastro': true, 'irmão': true, 'fazerOrdem': true, 
          'pedidosQr': true, 'baixaCozinha': true, 'relacional': true, 'gráficos': true, 
          'configurar': true, 'estoque': true, 'painelCliente': true, 'gmeas': true, 
          'siteQr': true, 'entrega': true, 'porquinho': true, 'usuários': true, 
          'usuários de cozinha': true, 'promotor fiscal': true
        },
        isNewTenant: true,
        tenantName,
        tenantId,
        trialDays: Number(trialDays),
        skipStripeSubscription: true
      };
      
      dataService.setTenantId(tenantId);
      
      let userSaved = false;
      try {
        const res = await dataService.saveUser(newUser);
        if (res.success) {
          userSaved = true;
        }
      } catch (saveErr: any) {
        if (saveErr.message.includes('409') || saveErr.message.includes('já está em uso')) {
          userSaved = true;
        } else {
          throw saveErr;
        }
      }

      if (userSaved) {
        const userToStore = { ...newUser, tenant_id: tenantId };
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
        localStorage.setItem('tenant_id', tenantId);

        try {
          const adminWhatsApp = (import.meta as any).env.VITE_ADMIN_WHATSAPP || '5562994075417';
          const message = `ola! meu nome ${name} acabei de fazer o cadastro no sistema preciso da ativação imediata.\n\nDados do Cadastro:\nEmpresa ID: ${tenantId}\nE-mail: ${email}\nUsuário Admin: ${username}`;
          const encodedMessage = encodeURIComponent(message);
          
          window.open(`https://wa.me/${adminWhatsApp.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
          onRegisterAdmin(userToStore);
        } catch (redirectErr: any) {
          onRegisterAdmin(userToStore);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-emerald-600 p-8 text-center relative">
          <button 
            onClick={onBack}
            className="absolute left-4 top-4 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <UserPlus size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            Criar Nova Empresa
          </h1>
          <p className="text-emerald-100 text-sm mt-2">
            Registre seu restaurante e comece agora
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
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

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CNPJ da Empresa (Opcional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="00.000.000/0000-00"
                />
                <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              <button 
                type="button"
                onClick={handleConsultarCNPJ}
                disabled={loadingCnpj}
                className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loadingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Buscar
              </button>
            </div>
          </div>

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
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="ex: 12345678"
              />
              <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nome da Empresa</label>
            <div className="relative">
              <input 
                type="text" 
                name="organization"
                autoComplete="organization"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Nome Fantasia"
              />
              <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp da Empresa</label>
            <div className="relative">
              <input 
                type="text" 
                name="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="(00) 00000-0000"
              />
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">E-mail para Cobrança (@gmail.com)</label>
            <div className="relative">
              <input 
                type="email" 
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="seu@gmail.com"
              />
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar E-mail</label>
            <div className="relative">
              <input 
                type="email" 
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Confirme seu e-mail"
              />
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Seu Nome (Admin)</label>
            <div className="relative">
              <input 
                type="text" 
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Seu nome completo"
              />
              <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Usuário de Acesso</label>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                <Info size={10} />
                Não esqueça seu usuário!
              </div>
            </div>
            <div className="relative">
              <input 
                type="text" 
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Ex: admin"
              />
              <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Senha</label>
              <div className="text-[9px] font-bold text-gray-400 uppercase leading-tight text-right">
                Mín. 8 caracteres e 1 caractere especial (@, #, etc)
              </div>
            </div>
            <div className="relative">
              <input 
                type="password" 
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {loading ? 'Aguarde...' : 'Criar Conta e Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
