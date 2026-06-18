import React, { useState, useEffect } from 'react';
import { SiteConfig, Categoria } from '../types';
import { dataService } from '../services/dataService';
import { Image as ImageIcon, Layout, Type, Save, Trash2, Plus, Globe, QrCode, Palette, Video, Edit3, ChevronUp, ChevronDown, ListOrdered } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SiteQrCodeTab() {
  const [config, setConfig] = useState<SiteConfig>({
    banner: null,
    logo: null,
    description: '',
    useDigitalMenu: true,
    menuImages: [],
    primaryColor: '#2563eb',
    backgroundColor: '#f9fafb',
    videoUrl: '',
    customName: '',
    categoryOrder: [],
    autoCategoryOrder: true,
    showLogo: true
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [menuCode, setMenuCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    Promise.all([
      dataService.getSiteConfig(),
      dataService.getCategorias(),
      dataService.getSubscription().catch(() => ({}))
    ]).then(([siteConfig, cats, sub]) => {
      setConfig(prev => ({
        ...prev,
        ...siteConfig,
        categoryOrder: siteConfig.categoryOrder || []
      }));
      setCategorias(cats || []);
      setMenuCode(sub.menuCode || localStorage.getItem('tenant_id') || '');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataService.saveSiteConfig(config);
      alert('Configurações do site salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'logo' | 'menuImages') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (field === 'menuImages') {
      const readers = (Array.from(files) as File[]).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((results) => {
        setConfig(prev => ({ ...prev, menuImages: [...prev.menuImages, ...(results as string[])] }));
      });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setConfig(prev => ({ ...prev, [field]: ev.target?.result as string }));
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const removeMenuImage = (index: number) => {
    setConfig(prev => ({
      ...prev,
      menuImages: prev.menuImages.filter((_, i) => i !== index)
    }));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...(config.categoryOrder || [])];
    if (newOrder.length === 0) {
      // Initialize order if empty
      categorias.forEach(c => newOrder.push(c.nome));
    }
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setConfig(prev => ({ ...prev, categoryOrder: newOrder }));
  };

  const currentOrder = config.autoCategoryOrder 
    ? categorias.map(c => c.nome)
    : (config.categoryOrder && config.categoryOrder.length > 0 ? config.categoryOrder : categorias.map(c => c.nome));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            Site QR Code
            <Globe className="text-blue-600" size={28} />
          </h1>
          <p className="text-gray-500 font-bold text-sm">Personalize a experiência digital do seu cliente.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Identity & Custom Name */}
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <ImageIcon className="text-blue-600" size={24} />
                Identidade & Nome
              </h2>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 bg-gray-50 rounded-full border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                    {config.logo ? (
                      <img src={config.logo} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <ImageIcon className="text-gray-300" size={32} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'logo')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-gray-100">
                    <Edit3 size={14} className="text-blue-600" />
                  </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Exibir Logo</span>
                      <span className="text-xs font-bold text-gray-600">Mostrar logo no topo do site</span>
                    </div>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        config.showLogo ? "bg-blue-600" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        config.showLogo ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome de Exibição no Site</label>
                    <div className="flex items-center gap-2">
                      {isEditingName ? (
                        <input 
                          type="text"
                          value={config.customName}
                          onChange={(e) => setConfig(prev => ({ ...prev, customName: e.target.value }))}
                          onBlur={() => setIsEditingName(false)}
                          autoFocus
                          placeholder="Nome do seu restaurante"
                          className="flex-1 px-4 py-2 border-2 border-blue-100 rounded-xl outline-none focus:border-blue-500 font-bold"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-between bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                          <span className="font-bold text-gray-700">{config.customName || 'Nome Padrão'}</span>
                          <button onClick={() => setIsEditingName(true)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-colors">
                            <Edit3 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Banner Principal</label>
                    <div className="relative group h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                      {config.banner ? (
                        <img src={config.banner} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Banner" />
                      ) : (
                        <ImageIcon className="text-gray-300" size={24} />
                      )}
                      <input 
                        type="file" 
                        onChange={(e) => handleFileChange(e, 'banner')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição / Slogan</label>
                <textarea 
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: O melhor hambúrguer artesanal da região..."
                  className="w-full h-24 px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-medium"
                />
              </div>
            </div>
          </section>

          {/* Colors & Video */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Palette className="text-blue-600" size={24} />
                Cores do Site
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cor Principal</span>
                    <span className="text-xs font-bold text-gray-600">Bordas e Botões</span>
                  </div>
                  <input 
                    type="color" 
                    value={config.primaryColor || '#2563eb'}
                    onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cor de Fundo</span>
                    <span className="text-xs font-bold text-gray-600">Fundo do Site</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, backgroundColor: 'transparent' }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                        config.backgroundColor === 'transparent' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400 border-gray-200"
                      )}
                    >
                      Transparente
                    </button>
                    <input 
                      type="color" 
                      value={config.backgroundColor === 'transparent' ? '#ffffff' : (config.backgroundColor || '#f9fafb')}
                      onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Video className="text-blue-600" size={24} />
                Vídeo em Destaque
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Link do Vídeo (YouTube/Vimeo)</label>
                  <input 
                    type="text"
                    value={config.videoUrl || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">
                  O vídeo será exibido logo abaixo da descrição do restaurante, ideal para mostrar o ambiente ou preparo dos pratos.
                </p>
              </div>
            </div>
          </section>

          {/* Category Ordering */}
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <ListOrdered className="text-blue-600" size={24} />
                Ordem das Categorias
              </h2>
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, autoCategoryOrder: true }))}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    config.autoCategoryOrder ? "bg-blue-600 text-white shadow-md" : "text-gray-400"
                  )}
                >
                  Automático
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, autoCategoryOrder: false }))}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    !config.autoCategoryOrder ? "bg-blue-600 text-white shadow-md" : "text-gray-400"
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            {!config.autoCategoryOrder && (
              <div className="space-y-2">
                {currentOrder.map((catName, idx) => (
                  <div key={catName} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="flex items-center gap-4">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-700">{catName}</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => moveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <ChevronUp size={20} />
                      </button>
                      <button 
                        onClick={() => moveCategory(idx, 'down')}
                        disabled={idx === currentOrder.length - 1}
                        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {config.autoCategoryOrder && (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                <p className="text-sm font-bold text-gray-400">As categorias serão exibidas na ordem em que foram criadas.</p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Menu Type & Link */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Layout className="text-blue-600" size={24} />
              Modo de Exibição
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setConfig(prev => ({ ...prev, useDigitalMenu: true }))}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4",
                  config.useDigitalMenu ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.useDigitalMenu ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                  <Globe size={20} />
                </div>
                <div>
                  <div className={cn("font-black uppercase text-[10px] tracking-widest", config.useDigitalMenu ? "text-blue-600" : "text-gray-400")}>Cardápio Digital</div>
                  <div className="text-xs font-bold text-gray-600">Interativo com pedidos</div>
                </div>
              </button>

              <button
                onClick={() => setConfig(prev => ({ ...prev, useDigitalMenu: false }))}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4",
                  !config.useDigitalMenu ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", !config.useDigitalMenu ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <div className={cn("font-black uppercase text-[10px] tracking-widest", !config.useDigitalMenu ? "text-blue-600" : "text-gray-400")}>Imagens Estáticas</div>
                  <div className="text-xs font-bold text-gray-600">Fotos do cardápio físico</div>
                </div>
              </button>
            </div>

            {!config.useDigitalMenu && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fotos do Cardápio</label>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                    <Plus size={18} />
                    <input type="file" multiple onChange={(e) => handleFileChange(e, 'menuImages')} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {config.menuImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-gray-100">
                      <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Menu" />
                      <button onClick={() => removeMenuImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-100 space-y-4">
            <div className="flex items-center gap-3 text-white">
              <QrCode size={24} />
              <h2 className="text-xl font-black uppercase tracking-tighter">Acesso Rápido</h2>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-3">
              <p className="text-[10px] font-bold text-blue-100 leading-relaxed">
                Este é o link público do seu cardápio. Você pode usá-lo em redes sociais ou bio do Instagram.
              </p>
              <div className="bg-white p-3 rounded-xl flex items-center justify-between gap-2">
                <code className="text-[10px] font-black text-blue-600 truncate">
                  https://restaurantesistema.com/menu/{menuCode}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://restaurantesistema.com/menu/${menuCode}`);
                    alert('Copiado!');
                  }}
                  className="text-[10px] font-black uppercase text-blue-800 hover:underline shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
