export interface Produto {
  id: number;
  nome: string;
  preco: number;
  tempo: number;
  imagem: string | null;
  categoria?: string;
  descricao?: string;
  ncm?: string;
  cfop?: string;
  cest?: string;
}

export interface Categoria {
  id: string;
  nome: string;
}

export interface Cliente {
  id: number;
  codigo: number;
  nome: string;
  empresa: string;
  tel: string;
  cpf: string;
  cnpj?: string;
}

export interface Venda {
  id: number;
  clienteId: number;
  desc: string;
  valor: number;
  data: string;
  pago: boolean;
  formaPagamento: string;
}

export interface ItemPedido {
  nome: string;
  preco: number;
  qtd: number;
  tempo: number;
  ncm?: string;
  cfop?: string;
}

export interface DeliveryConfig {
  id: number;
  platform: 'ifood' | 'ubereats' | 'rappi' | '99food' | 'keeta' | 'outro';
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  active: boolean;
  settings?: any;
}

export interface PedidoOnline {
  id: number;
  timestamp: number;
  tempoPreparo: number;
  codigoComanda: number;
  hora: string;
  identificacao: string;
  itens: ItemPedido[];
  total: number;
  status: 'Pendente' | 'Preparando' | 'Pronto' | 'Concluido' | 'Expirado' | 'Cancelado' | 'Aguardando Garçom';
  origem: 'Balcao' | 'Fiado' | 'App' | 'iFood' | 'Uber Eats' | 'Rappi' | '99Food' | 'Keeta' | 'Garçom' | 'QR Code';
  formaPagamento: string;
  horaConclusao?: number;
  waiterId?: string;
  commissionValue?: number;
  isExtra?: boolean;
  cookStartedId?: string;
  cookStartedName?: string;
  cookFinishedId?: string;
  cookFinishedName?: string;
  paymentWaiterId?: string;
  paymentWaiterName?: string;
  fiscal_chave?: string;
  fiscal_protocolo?: string;
}

export interface EstoqueItem {
  id: number;
  nome: string;
  qtd: string;
  validade: string;
}

export interface FiscalConfig {
  cnpj: string;
  inscricaoEstadual: string;
  csc: string;
  cscId: string;
  ambiente: 'homologacao' | 'producao';
  tokenApi?: string;
}

export interface Config {
  pix: string;
  beneficiario: string;
  nomeBanco: string;
  obs: string;
  kitchen_skip_start?: boolean;
  fiscal?: FiscalConfig;
}

export interface SiteConfig {
  banner: string | null;
  logo: string | null;
  description: string;
  useDigitalMenu: boolean;
  menuImages: string[];
  primaryColor?: string;
  backgroundColor?: string;
  videoUrl?: string;
  customName?: string;
  categoryOrder?: string[];
  autoCategoryOrder?: boolean;
  showLogo?: boolean;
}

export interface User {
  id: string;
  tenant_id?: string;
  username: string;
  password?: string; // In a real app, this would be hashed on the server
  role: 'admin' | 'user' | 'waiter' | 'cook';
  permissions: Record<string, boolean>; // JSON object: { tabId: true/false }
  name: string;
  trial_ends_at?: string;
  waiterConfig?: {
    commissionRate: number; // percentage
    commissionOnQrExtra: boolean;
    commissionOnConfirmed: boolean;
    totalCommissionEarned: number;
  };
  kitchenCode?: string; // For kitchen staff
}

export interface CaixaFluxo {
  id: number;
  tenant_id: string;
  userId: string;
  userName: string;
  status: 'aberto' | 'fechado';
  valorInicial: number;
  valorFinal?: number;
  dataAbertura: number;
  dataFechamento?: number;
  observacoes?: string;
}

export interface Mesa {
  id: number;
  numero: string;
  qrCode?: string;
}

export interface Reserva {
  id: number;
  mesaId: number;
  mesaNumero: string;
  clienteNome: string;
  data: string;
  hora: string;
  pessoas: number;
  status: 'pendente' | 'confirmada' | 'cancelada' | 'finalizada';
  observacoes?: string;
}
