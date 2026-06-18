const API_URL = '/api';

let currentTenantId = localStorage.getItem('tenant_id') || '';

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (currentTenantId) {
    headers['x-tenant-id'] = currentTenantId;
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let message = errorData.error || `Erro na requisição em ${res.url}: ${res.statusText || res.status}`;
    
    if (res.status === 503) {
      message = "O banco de dados não está conectado. Por favor, configure as credenciais no menu Settings -> Secrets.";
    }
    
    const localErr: any = new Error(message);
    localErr.status = res.status;
    localErr.needsPayment = errorData.needsPayment;
    localErr.suspended = errorData.suspended;
    localErr.tenantId = errorData.tenantId;
    localErr.tenantName = errorData.tenantName;
    throw localErr;
  }
  return res.json().catch(err => {
    console.error(`Falha ao converter para JSON em ${res.url}:`, err);
    throw new Error(`Resposta inválida (não JSON) do servidor em ${res.url}. Certifique-se de que a rota da API existe.`);
  });
};

export const dataService = {
  getHealth: () => fetch(`${API_URL}/health`).then(handleResponse),
  setTenantId: (id: string) => {
    currentTenantId = id;
    localStorage.setItem('tenant_id', id);
  },

  login: (credentials: any) => fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }).then(handleResponse),

  // Users
  getUsers: () => fetch(`${API_URL}/users`, { headers: getHeaders() }).then(handleResponse),
  saveUser: (user: any) => fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
  }).then(handleResponse),
  updateUser: (id: string, user: any) => fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(user)
  }).then(handleResponse),
  deleteUser: (id: string) => fetch(`${API_URL}/users/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Forgot Password
  forgotPassword: (email: string, tenantId: string) => fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tenantId })
  }).then(handleResponse),
  verifyResetCode: (email: string, tenantId: string, code: string) => fetch(`${API_URL}/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tenantId, code })
  }).then(handleResponse),
  resetPassword: (data: any) => fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Produtos
  getProdutos: () => fetch(`${API_URL}/produtos`, { headers: getHeaders() }).then(handleResponse),
  saveProduto: (produto: any) => fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(produto)
  }).then(handleResponse),
  updateProduto: (id: number, produto: any) => fetch(`${API_URL}/produtos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(produto)
  }).then(handleResponse),
  deleteProduto: (id: number) => fetch(`${API_URL}/produtos/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Categorias
  getCategorias: () => fetch(`${API_URL}/categorias`, { headers: getHeaders() }).then(handleResponse),
  saveCategoria: (categoria: any) => fetch(`${API_URL}/categorias`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(categoria)
  }).then(handleResponse),
  deleteCategoria: (id: string) => fetch(`${API_URL}/categorias/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Clientes
  getClientes: () => fetch(`${API_URL}/clientes`, { headers: getHeaders() }).then(handleResponse),
  saveCliente: (cliente: any) => fetch(`${API_URL}/clientes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(cliente)
  }).then(handleResponse),
  deleteCliente: (id: number) => fetch(`${API_URL}/clientes/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Vendas
  getVendas: () => fetch(`${API_URL}/vendas`, { headers: getHeaders() }).then(handleResponse),
  saveVenda: (venda: any) => fetch(`${API_URL}/vendas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(venda)
  }).then(handleResponse),

  // Pedidos
  getPedidos: () => fetch(`${API_URL}/pedidos`, { headers: getHeaders() }).then(handleResponse),
  savePedido: (pedido: any) => fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(pedido)
  }).then(handleResponse),
  updatePedido: (id: number, data: any) => fetch(`${API_URL}/pedidos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Estoque
  getEstoque: () => fetch(`${API_URL}/estoque`, { headers: getHeaders() }).then(handleResponse),
  saveEstoque: (item: any) => fetch(`${API_URL}/estoque`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item)
  }).then(handleResponse),

  // Config
  getConfig: () => fetch(`${API_URL}/config`, { headers: getHeaders() }).then(handleResponse),
  saveConfig: (config: any) => fetch(`${API_URL}/config`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config)
  }).then(handleResponse),

  // Delivery Configs
  getDeliveryConfigs: () => fetch(`${API_URL}/delivery-configs`, { headers: getHeaders() }).then(handleResponse),
  saveDeliveryConfig: (config: any) => fetch(`${API_URL}/delivery-configs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config)
  }).then(handleResponse),
  updateDeliveryConfig: (id: number, config: any) => fetch(`${API_URL}/delivery-configs/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(config)
  }).then(handleResponse),
  deleteDeliveryConfig: (id: number) => fetch(`${API_URL}/delivery-configs/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Site Config
  getSiteConfig: () => fetch(`${API_URL}/site-config`, { headers: getHeaders() }).then(handleResponse),
  saveSiteConfig: (config: any) => fetch(`${API_URL}/site-config`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config)
  }).then(handleResponse),
  getPublicMenu: (tenantId: string) => fetch(`${API_URL}/public/menu/${tenantId}`).then(handleResponse),
  savePublicPedido: (tenantId: string, pedido: any) => fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
    body: JSON.stringify(pedido)
  }).then(handleResponse),

  // Subscription
  getSubscription: () => fetch(`${API_URL}/subscription`, { headers: getHeaders() }).then(handleResponse),
  createCheckoutSession: (priceId: string, trialDays?: number, tenantId?: string, email?: string) => fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ priceId, trialDays, tenantId, email })
  }).then(handleResponse),
  createPortalSession: () => fetch(`${API_URL}/create-portal-session`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse),

  // Super Admin
  getAdminTenants: () => fetch(`${API_URL}/admin/tenants`, { headers: getHeaders() }).then(handleResponse),
  deleteAdminTenant: (id: string) => fetch(`${API_URL}/admin/tenants/${id}`, { 
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),
  getAdminStats: () => fetch(`${API_URL}/admin/stats`, { headers: getHeaders() }).then(handleResponse),
  updateTenantStatus: (id: string, active: boolean) => fetch(`${API_URL}/admin/tenants/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ active })
  }).then(handleResponse),
  updateAdminTenant: (id: string, tenant: any) => fetch(`${API_URL}/admin/tenants/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(tenant)
  }).then(handleResponse),

  // Waiter Portal
  waiterLogin: (username: string, password: string, menuCode: string) => fetch(`${API_URL}/waiter/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, menuCode })
  }).then(handleResponse),
  sendWhatsAppCode: (whatsapp: string) => fetch(`${API_URL}/auth/whatsapp/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp })
  }).then(handleResponse),
  verifyWhatsAppCode: (whatsapp: string, code: string) => fetch(`${API_URL}/auth/whatsapp/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp, code })
  }).then(handleResponse),
  getWaiterCommissions: (waiterId: string) => fetch(`${API_URL}/waiter/commissions?waiterId=${waiterId}`, { headers: getHeaders() }).then(handleResponse),
  getTopSellingByWaiter: () => fetch(`${API_URL}/waiter/top-selling`, { headers: getHeaders() }).then(handleResponse),
  getTenantByCode: (code: string) => fetch(`${API_URL}/tenants/by-code/${code}`).then(handleResponse),
  getPedidosMesa: (mesa: string) => fetch(`${API_URL}/pedidos/mesa/${mesa}`, { headers: getHeaders() }).then(handleResponse),
  pagarMesa: (mesa: string, formaPagamento: string) => fetch(`${API_URL}/pedidos/mesa/${mesa}/pagar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ formaPagamento })
  }).then(handleResponse),

  // Status check for real-time trial/suspension updates
  getStatus: (tenantId: string) => fetch(`${API_URL}/user/status`, { 
    headers: { ...getHeaders(), 'x-tenant-id': tenantId }
  }).then(handleResponse),

  // Caixa
  getCaixaStatus: () => fetch(`${API_URL}/caixa/status`, { headers: getHeaders() }).then(handleResponse),
  abrirCaixa: (data: any) => fetch(`${API_URL}/caixa/abrir`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse),
  fecharCaixa: (data: any) => fetch(`${API_URL}/caixa/fechar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse),
  getCaixaHistorico: () => fetch(`${API_URL}/caixa/historico`, { headers: getHeaders() }).then(handleResponse),

  // Mesas
  getMesas: () => fetch(`${API_URL}/mesas`, { headers: getHeaders() }).then(handleResponse),
  saveMesa: (mesa: any) => fetch(`${API_URL}/mesas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(mesa)
  }).then(handleResponse),
  updateMesa: (id: number, mesa: any) => fetch(`${API_URL}/mesas/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(mesa)
  }).then(handleResponse),
  deleteMesa: (id: number) => fetch(`${API_URL}/mesas/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse),

  // Reservas
  getReservas: () => fetch(`${API_URL}/reservas`, { headers: getHeaders() }).then(handleResponse),
  saveReserva: (reserva: any) => fetch(`${API_URL}/reservas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reserva)
  }).then(handleResponse),
  updateReserva: (id: number, reserva: any) => fetch(`${API_URL}/reservas/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(reserva)
  }).then(handleResponse),
  deleteReserva: (id: number) => fetch(`${API_URL}/reservas/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse)
};
