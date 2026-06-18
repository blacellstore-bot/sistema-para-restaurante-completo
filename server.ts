import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import nodemailer from 'nodemailer';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(fileURLToPath((import.meta as any).url || 'file://'));

// Database Connection
let pool: mysql.Pool | null = null;
let dbError: string | null = null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      db: pool ? 'connected' : 'disconnected', 
      dbError: dbError,
      dbHost: process.env.DB_HOST || 'localhost',
      env: process.env.NODE_ENV,
      serverTime: new Date().toISOString()
    });
  });

  // Status check for real-time trial updates
  app.get('/api/user/status', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const [tenants]: any = await pool!.query('SELECT trial_ends_at, active FROM tenants WHERE id = ?', [tenantId]);
      if (tenants.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json({
        trial_ends_at: tenants[0].trial_ends_at,
        active: tenants[0].active
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Initialize Tables
  const initDb = async () => {
    if (!pool) return;

    try {
      // Ensure kitchenCode column exists for existing databases
      try {
        await pool.query('ALTER TABLE users ADD COLUMN kitchenCode VARCHAR(10)');
      } catch (err) {}
      try {
        await pool.query('ALTER TABLE config ADD COLUMN kitchen_skip_start BOOLEAN DEFAULT FALSE');
      } catch (err) {}
    } catch (err) {
      console.error('Error adding kitchenCode column:', err);
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        slug VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        password VARCHAR(255),
        whatsapp VARCHAR(50),
        active BOOLEAN DEFAULT FALSE,
        subscription_status VARCHAR(50) DEFAULT 'active',
        menu_code VARCHAR(16) UNIQUE,
        permissions JSON DEFAULT NULL,
        trial_ends_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255),
        username VARCHAR(255),
        password VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50),
        permissions JSON,
        waiterConfig JSON,
        kitchenCode VARCHAR(10),
        UNIQUE KEY (tenant_id, username)
      )`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (email, tenant_id)
      )`,
      `CREATE TABLE IF NOT EXISTS produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        nome VARCHAR(255),
        preco DECIMAL(10,2),
        tempo INT,
        imagem LONGTEXT,
        categoria VARCHAR(255),
        descricao TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        codigo INT,
        nome VARCHAR(255),
        empresa VARCHAR(255),
        tel VARCHAR(50),
        cpf VARCHAR(20),
        cnpj VARCHAR(20)
      )`,
      `CREATE TABLE IF NOT EXISTS vendas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        clienteId INT,
        \`desc\` TEXT,
        valor DECIMAL(10,2),
        data VARCHAR(50),
        pago BOOLEAN,
        formaPagamento VARCHAR(50)
      )`,
      `CREATE TABLE IF NOT EXISTS pedidos_online (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        timestamp BIGINT,
        tempoPreparo INT,
        codigoComanda INT,
        hora VARCHAR(50),
        identificacao VARCHAR(255),
        itens JSON,
        total DECIMAL(10,2),
        status VARCHAR(50),
        origem VARCHAR(50),
        formaPagamento VARCHAR(50),
        horaConclusao BIGINT,
        waiterId VARCHAR(255),
        commissionValue DECIMAL(10,2),
        isExtra BOOLEAN,
        cookStartedId VARCHAR(255),
        cookStartedName VARCHAR(255),
        cookFinishedId VARCHAR(255),
        cookFinishedName VARCHAR(255),
        paymentWaiterId VARCHAR(255),
        paymentWaiterName VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS estoque (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        nome VARCHAR(255),
        qtd VARCHAR(50),
        validade VARCHAR(50)
      )`,
      `CREATE TABLE IF NOT EXISTS config (
        tenant_id VARCHAR(255) PRIMARY KEY,
        pix VARCHAR(255),
        beneficiario VARCHAR(255),
        nomeBanco VARCHAR(255),
        obs TEXT,
        kitchen_skip_start BOOLEAN DEFAULT FALSE
      )`,
      `CREATE TABLE IF NOT EXISTS categorias (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255),
        nome VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS site_config (
        tenant_id VARCHAR(255) PRIMARY KEY,
        banner LONGTEXT,
        logo LONGTEXT,
        description TEXT,
        useDigitalMenu BOOLEAN DEFAULT TRUE,
        menuImages JSON,
        primaryColor VARCHAR(50),
        backgroundColor VARCHAR(50),
        videoUrl VARCHAR(255),
        customName VARCHAR(255),
        categoryOrder JSON,
        autoCategoryOrder BOOLEAN DEFAULT TRUE,
        showLogo BOOLEAN DEFAULT TRUE
      )`,
      `CREATE TABLE IF NOT EXISTS delivery_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        platform VARCHAR(50),
        apiKey TEXT,
        apiSecret TEXT,
        merchantId VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        settings JSON
      )`,
      `CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        \`value\` TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS caixa_fluxo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        userId VARCHAR(255),
        userName VARCHAR(255),
        status VARCHAR(20),
        valorInicial DECIMAL(10,2),
        valorFinal DECIMAL(10,2),
        dataAbertura BIGINT,
        dataFechamento BIGINT,
        observacoes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS mesas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        numero VARCHAR(50),
        qrCode TEXT,
        UNIQUE KEY (tenant_id, numero)
      )`,
      `CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(255),
        mesaId INT,
        clienteNome VARCHAR(255),
        data VARCHAR(20),
        hora VARCHAR(10),
        pessoas INT,
        status VARCHAR(20),
        observacoes TEXT
      )`
    ];

    // Add email and password columns to tenants if they don't exist
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN email VARCHAR(255) AFTER slug');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN password VARCHAR(255) AFTER email');
    } catch (e) {}

    // Add kitchen_skip_start column if it doesn't exist
    try {
      await pool.query('ALTER TABLE config ADD COLUMN kitchen_skip_start BOOLEAN DEFAULT FALSE');
    } catch (e) {}

    // Add showLogo column to site_config if it doesn't exist
    try {
      await pool.query('ALTER TABLE site_config ADD COLUMN showLogo BOOLEAN DEFAULT TRUE');
    } catch (e) {}

    // Add menu_code column if it doesn't exist
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN menu_code VARCHAR(16) UNIQUE AFTER trial_ends_at');
    } catch (e) {}

    // Add fiscal column to config if it doesn't exist
    try {
      await pool.query('ALTER TABLE config ADD COLUMN fiscal JSON');
    } catch (e) {}

    // Add fiscal columns to produtos if they don't exist
    try {
      await pool.query('ALTER TABLE produtos ADD COLUMN ncm VARCHAR(20)');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE produtos ADD COLUMN cfop VARCHAR(20)');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE produtos ADD COLUMN cest VARCHAR(20)');
    } catch (e) {}

    // Add fiscal columns to pedidos_online if they don't exist
    try {
      await pool.query('ALTER TABLE pedidos_online ADD COLUMN fiscal_chave VARCHAR(255)');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE pedidos_online ADD COLUMN fiscal_protocolo VARCHAR(255)');
    } catch (e) {}

    // Add cnpj column to clientes if it doesn't exist
    try {
      await pool.query('ALTER TABLE clientes ADD COLUMN cnpj VARCHAR(20)');
    } catch (e) {}

    // Add whatsapp column if it doesn't exist
    try {
      await pool.query('ALTER TABLE tenants ADD COLUMN whatsapp VARCHAR(50) AFTER slug');
    } catch (e) {}

    // Populate menu_code for existing tenants
    try {
      const [tenants]: any = await pool.query('SELECT id FROM tenants WHERE menu_code IS NULL');
      for (const tenant of tenants) {
        let code = '';
        let isUnique = false;
        while (!isUnique) {
          code = '';
          for (let i = 0; i < 16; i++) {
            code += Math.floor(Math.random() * 10).toString();
          }
          const [existing]: any = await pool.query('SELECT id FROM tenants WHERE menu_code = ?', [code]);
          if (existing.length === 0) isUnique = true;
        }
        await pool.query('UPDATE tenants SET menu_code = ? WHERE id = ?', [code, tenant.id]);
      }
    } catch (e) {
      console.error('Erro ao migrar menu_code:', e);
    }

    for (const q of queries) {
      await pool.query(q);
    }

    // Initialization complete

    // Add email column
    try {
      await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) AFTER name');
    } catch (e) {}

    // Update imagem column to LONGTEXT in produtos
    try {
      await pool.query('ALTER TABLE produtos MODIFY COLUMN imagem LONGTEXT');
    } catch (e) {}

    // Add categorization and site config columns
    try { await pool.query('ALTER TABLE produtos ADD COLUMN categoria VARCHAR(255)'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN primaryColor VARCHAR(50)'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN backgroundColor VARCHAR(50)'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN videoUrl VARCHAR(255)'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN customName VARCHAR(255)'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN categoryOrder JSON'); } catch (e) {}
    try { await pool.query('ALTER TABLE site_config ADD COLUMN autoCategoryOrder BOOLEAN DEFAULT TRUE'); } catch (e) {}

    // Manual trial and permissions columns for tenants
    try { await pool.query('ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME DEFAULT NULL'); } catch (e) {}
    try { await pool.query('ALTER TABLE tenants ADD COLUMN permissions JSON DEFAULT NULL'); } catch (e) {}
    
    // Ensure system tenant exists
    const trackingColumns = [
      'ALTER TABLE pedidos_online ADD COLUMN cookStartedId VARCHAR(255)',
      'ALTER TABLE pedidos_online ADD COLUMN cookStartedName VARCHAR(255)',
      'ALTER TABLE pedidos_online ADD COLUMN cookFinishedId VARCHAR(255)',
      'ALTER TABLE pedidos_online ADD COLUMN cookFinishedName VARCHAR(255)',
      'ALTER TABLE pedidos_online ADD COLUMN paymentWaiterId VARCHAR(255)',
      'ALTER TABLE pedidos_online ADD COLUMN paymentWaiterName VARCHAR(255)'
    ];
    for (const colQuery of trackingColumns) {
      try {
        await pool.query(colQuery);
      } catch (e) {}
    }
  };

  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'restaurante_db',
      waitForConnections: true,
      connectionLimit: 100,
      maxIdle: 20, // increased from 10
      idleTimeout: 30000, // decreased from 60000 to close stale connections faster
      queueLimit: 0,
      connectTimeout: 30000, // increased from 20000
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000, // decreased from 10000
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

    if (!process.env.DB_HOST) console.warn('⚠️ [DB] DB_HOST não definido, usando "localhost"');
    if (!process.env.DB_USER) console.warn('⚠️ [DB] DB_USER não definido, usando "root"');
    if (!process.env.DB_PASS && !process.env.DB_PASSWORD) console.warn('⚠️ [DB] DB_PASS não definido, tentando conexão sem senha');

    pool = mysql.createPool(dbConfig);
    
    const poolAny = pool as any;
    // Add error handler to pool to prevent process crash on unexpected connection loss
    poolAny.on('error', (err: any) => {
      console.error('⚠️ [DB Pool] Erro inesperado no banco de dados:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.warn('⚠️ [DB Pool] Conexão perdida. O pool tentará reconectar na próxima requisição.');
      }
    });

    console.log(`[DB] Tentando conectar ao MySQL:`);
    console.log(`[DB] Host: ${dbConfig.host}`);
    console.log(`[DB] Banco: ${dbConfig.database}`);
    console.log(`[DB] Usuário: ${dbConfig.user}`);
    
    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ [DB] Conectado ao MySQL com sucesso!');

    // Initialize Tables
    await initDb();
  } catch (err: any) {
    pool = null; // Ensure pool is null if connection fails
    const localErr = new Error(`Erro de conexão com o banco de dados: ${err.message}. Certifique-se de que as variáveis de ambiente (DB_HOST, DB_USER, DB_PASS, DB_NAME) estão configuradas corretamente no menu Settings -> Secrets.`);
    dbError = localErr.message;
    console.error('❌', localErr.message);
  }

  // Helper to get tenant_id from headers
  const getTenantId = (req: any) => req.resolvedTenantId || req.headers['x-tenant-id'] as string;

  // Cache for tenant data to reduce DB load
  const tenantCache = new Map<string, { data: any, timestamp: number }>();
  const menuCodeCache = new Map<string, { id: string, timestamp: number }>();
  const whatsappVerificationCodes = new Map<string, { code: string, expires: number }>();
  const CACHE_TTL = 30000; // 30 seconds

  // Middleware to resolve tenant_id from header (handles menu_code)
  const resolveTenant = async (req: any, res: express.Response, next: express.NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId || tenantId === 'system') {
      req.resolvedTenantId = tenantId;
      return next();
    }

    if (tenantId.length === 16 && /^\d+$/.test(tenantId)) {
      // Check cache first
      const cached = menuCodeCache.get(tenantId);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        req.resolvedTenantId = cached.id;
        return next();
      }

      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      try {
        const [tenants]: any = await pool.query('SELECT id FROM tenants WHERE menu_code = ?', [tenantId]);
        if (tenants.length > 0) {
          const id = tenants[0].id;
          menuCodeCache.set(tenantId, { id, timestamp: Date.now() });
          req.resolvedTenantId = id;
        } else {
          req.resolvedTenantId = tenantId;
        }
      } catch (e) {
        req.resolvedTenantId = tenantId;
      }
    } else {
      req.resolvedTenantId = tenantId;
    }
    next();
  };

  app.post('/api/auth/whatsapp/send-code', async (req, res) => {
    const { whatsapp } = req.body;
    if (!whatsapp) return res.status(400).json({ error: 'WhatsApp é obrigatório' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    whatsappVerificationCodes.set(whatsapp, { code, expires });

    console.log(`[WhatsApp Verification] Código para ${whatsapp}: ${code}`);

    // Integração Real com sua API de WhatsApp
    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
      try {
        const message = `Seu código de verificação para o sistema de restaurante é: ${code}`;
        
        // Exemplo genérico que funciona com a maioria das APIs (ajuste conforme necessário)
        await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`, // Algumas pedem 'apikey' ou 'token' no header
            'apikey': process.env.WHATSAPP_API_TOKEN // Comum na Evolution API
          },
          body: JSON.stringify({
            number: whatsapp, // Algumas pedem 'remoteJid' ou 'to'
            message: message, // Algumas pedem 'text' ou 'content'
            text: message    // Alternativa comum
          })
        });
        console.log(`WhatsApp enviado para ${whatsapp}`);
      } catch (err) {
        console.error('Erro ao enviar WhatsApp:', err);
      }
    }

    res.json({ success: true, message: 'Código enviado com sucesso' });
  });

  app.post('/api/auth/whatsapp/verify-code', async (req, res) => {
    const { whatsapp, code } = req.body;
    if (!whatsapp || !code) return res.status(400).json({ error: 'WhatsApp e código são obrigatórios' });

    const stored = whatsappVerificationCodes.get(whatsapp);
    if (!stored) return res.status(400).json({ error: 'Código expirado ou não solicitado' });

    if (Date.now() > stored.expires) {
      whatsappVerificationCodes.delete(whatsapp);
      return res.status(400).json({ error: 'Código expirado' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: 'Código incorreto' });
    }

    // Código válido
    whatsappVerificationCodes.delete(whatsapp);
    res.json({ success: true });
  });

  app.use(resolveTenant);

  // Middleware to check if tenant is active
  const checkTenantActive = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const tenantId = getTenantId(req);
    if (!tenantId || tenantId === 'system') return next();

    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      let tenant;
      const cached = tenantCache.get(tenantId);
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        tenant = cached.data;
      } else {
        const [tenants] = await pool.query<any[]>('SELECT active, name, trial_ends_at FROM tenants WHERE id = ?', [tenantId]);
        if (tenants.length > 0) {
          tenant = tenants[0];
          tenantCache.set(tenantId, { data: tenant, timestamp: Date.now() });
        }
      }

      if (tenant) {
        if (!tenant.active) {
          return res.status(403).json({ 
            error: 'Sua conta está SUSPENSA. Entre em contato com o suporte.', 
            suspended: true,
            tenantId: tenantId,
            tenantName: tenant.name || 'Cliente'
          });
        }

        if (tenant.trial_ends_at) {
          const expirationDate = new Date(tenant.trial_ends_at);
          if (expirationDate.getTime() < Date.now()) {
            return res.status(403).json({ 
              error: 'Seu período de uso expirou. Por favor, entre em contato com o administrador para renovar sua licença.',
              needsPayment: true,
              suspended: true,
              tenantId: tenantId,
              tenantName: tenant.name || 'Cliente'
            });
          }
        }
      }
      next();
    } catch (error: any) {
      console.error('Erro no middleware checkTenantActive:', error);
      res.status(500).json({ error: 'Erro interno ao verificar status da conta' });
    }
  };

  app.post('/api/waiter/login', checkTenantActive, async (req, res) => {
    const { username, password, menuCode } = req.body;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      // 1. Find tenant by menuCode or ID
      const [tenants]: any = await pool.query(
        'SELECT id FROM tenants WHERE menu_code = ? OR id = ?', 
        [menuCode, menuCode]
      );
      if (tenants.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada com este código' });
      }
      const tenantId = tenants[0].id;

      // 2. Find waiter in this tenant
      const [users]: any = await pool.query(
        'SELECT * FROM users WHERE tenant_id = ? AND username = ? AND role = "waiter"',
        [tenantId, username]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const user = users[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error('Erro no login do garçom:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/waiter/commissions', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    const waiterId = req.query.waiterId as string;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      const [results]: any = await pool.query(
        'SELECT SUM(commissionValue) as totalCommission, SUM(total) as totalSales FROM pedidos_online WHERE tenant_id = ? AND waiterId = ? AND status = "Concluido"',
        [tenantId, waiterId]
      );
      res.json({ 
        total: results[0].totalCommission || 0,
        totalSales: results[0].totalSales || 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar comissões' });
    }
  });

  app.get('/api/waiter/top-selling', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      // This is a bit complex because itens is JSON
      // We'll fetch all completed orders with waiter info and process in JS for simplicity, 
      // or try a more complex SQL if possible. Let's do a basic SQL for now.
      const [orders]: any = await pool.query(
        'SELECT itens, waiterId FROM pedidos_online WHERE tenant_id = ? AND status = "Concluido" AND waiterId IS NOT NULL',
        [tenantId]
      );

      const stats: any = {};
      orders.forEach((order: any) => {
        const itens = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens;
        const waiterId = order.waiterId;
        
        itens.forEach((item: any) => {
          const key = `${waiterId}_${item.nome}`;
          if (!stats[key]) {
            stats[key] = { waiterId, nome: item.nome, qtd: 0 };
          }
          stats[key].qtd += Number(item.qtd);
        });
      });

      res.json(Object.values(stats));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  });

  app.get('/api/tenants/by-code/:code', async (req, res) => {
    const { code } = req.params;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      // Search by menu_code or by ID if consistent (8 digits)
      const [tenants]: any = await pool.query(
        'SELECT id, name, slug FROM tenants WHERE menu_code = ? OR id = ?', 
        [code, code]
      );
      if (tenants.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      res.json(tenants[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
  });

  app.get('/api/pedidos/mesa/:mesa', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    const { mesa } = req.params;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      const [pedidos]: any = await pool.query(
        'SELECT * FROM pedidos_online WHERE tenant_id = ? AND identificacao = ? AND status != "Concluido" AND status != "Cancelado"',
        [tenantId, mesa]
      );
      res.json(pedidos);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar pedidos da mesa' });
    }
  });

  app.post('/api/pedidos/mesa/:mesa/pagar', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    const { mesa } = req.params;
    const { formaPagamento, waiterId, waiterName } = req.body;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      // Mark all active orders for this table as completed
      await pool.query(
        'UPDATE pedidos_online SET status = "Concluido", horaConclusao = ?, formaPagamento = ?, paymentWaiterId = ?, paymentWaiterName = ? WHERE tenant_id = ? AND identificacao = ? AND status != "Concluido" AND status != "Cancelado"',
        [Date.now(), formaPagamento || 'Dinheiro', waiterId || null, waiterName || null, tenantId, mesa]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
  });

  // iFood API Helpers
  const getIFoodToken = async () => {
    const clientId = process.env.IFOOD_CLIENT_ID;
    const clientSecret = process.env.IFOOD_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('iFood Client ID ou Secret não configurados no .env');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
      method: 'POST',
      body: params
    });

    if (!response.ok) {
      throw new Error('Falha ao obter token do iFood');
    }

    return response.json();
  };

  // Uber Eats API Helpers
  const getUberEatsToken = async () => {
    const clientId = process.env.UBEREATS_CLIENT_ID;
    const clientSecret = process.env.UBEREATS_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Uber Eats Client ID ou Secret não configurados no .env');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'eats.order');

    const response = await fetch('https://login.uber.com/oauth/v2/token', {
      method: 'POST',
      body: params
    });

    if (!response.ok) {
      throw new Error('Falha ao obter token do Uber Eats');
    }

    return response.json();
  };

  // Rappi API Helpers
  const getRappiToken = async () => {
    const clientId = process.env.RAPPI_CLIENT_ID;
    const clientSecret = process.env.RAPPI_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Rappi Client ID ou Secret não configurados no .env');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch('https://microservices.rappi.com/api/v2/auth/token', {
      method: 'POST',
      body: params
    });

    if (!response.ok) {
      throw new Error('Falha ao obter token do Rappi');
    }

    return response.json();
  };

  // 99Food API Helpers
  const getNinetyNineFoodToken = async () => {
    const clientId = process.env.NINETYNINEFOOD_CLIENT_ID;
    const clientSecret = process.env.NINETYNINEFOOD_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('99Food não configurado');
    // Lógica de token da 99Food
    return { access_token: 'dummy' };
  };

  // Aiqfome API Helpers
  const getAiqfomeToken = async () => {
    const clientId = process.env.AIQFOME_CLIENT_ID;
    const clientSecret = process.env.AIQFOME_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Aiqfome não configurado');
    // Lógica de token da Aiqfome
    return { access_token: 'dummy' };
  };

  // Delivery Much API Helpers
  const getDeliveryMuchToken = async () => {
    const clientId = process.env.DELIVERYMUCH_CLIENT_ID;
    const clientSecret = process.env.DELIVERYMUCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Delivery Much não configurado');
    // Lógica de token da Delivery Much
    return { access_token: 'dummy' };
  };

  // Background Polling for Delivery Orders
  let isPollingDelivery = false;
  const pollDeliveryOrders = async () => {
    if (!pool || isPollingDelivery) return;
    isPollingDelivery = true;
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        // iFood Polling
        const [ifoodConfigs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "ifood" AND active = TRUE');
        // ... (resto da lógica de polling continuaria aqui se estivesse implementada)

        // Uber Eats Polling
        const [uberConfigs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "ubereats" AND active = TRUE');

        // Rappi Polling
        const [rappiConfigs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "rappi" AND active = TRUE');

        // 99Food Polling
        const [n99Configs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "99food" AND active = TRUE');
        
        // Aiqfome Polling
        const [aiqConfigs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "aiqfome" AND active = TRUE');

        // Delivery Much Polling
        const [dmConfigs]: any = await pool.query('SELECT * FROM delivery_configs WHERE platform = "deliverymuch" AND active = TRUE');
        
        break; // Sucesso, sai do loop de tentativas
      } catch (err: any) {
        attempts++;
        lastError = err;

        const isConnError = ['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'].includes(err.code);
        
        if (isConnError && attempts < maxAttempts) {
          console.warn(`⚠️ [Polling Retry] Re-tentativa de polling (${attempts}/${maxAttempts}) devido a erro de conexão: ${err.code}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Espera progressiva (1s, 2s...)
          continue;
        }
        
        // Se não for erro de conexão ou atingiu o limite, para as tentativas
        break;
      }
    }

    if (attempts >= maxAttempts && lastError) {
      console.error('❌ Erro persistente no polling de delivery após retentativas:', lastError);
    }

    isPollingDelivery = false;
  };

  // Iniciar polling a cada 30 segundos
  setInterval(pollDeliveryOrders, 30000);

  // API Routes
  const generateMenuCode = async () => {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 16; i++) {
        code += Math.floor(Math.random() * 10).toString();
      }
      if (!pool) break;
      const [existing]: any = await pool.query('SELECT id FROM tenants WHERE menu_code = ?', [code]);
      if (existing.length === 0) isUnique = true;
    }
    return code;
  };

  app.get('/api/users', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado. Verifique as configurações no menu Settings -> Secrets.' });
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID ausente' });
      const [rows]: any = await pool.query('SELECT * FROM users WHERE tenant_id = ?', [tenantId]);
      
      const parsedRows = rows.map((u: any) => ({
        ...u,
        permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || {})
      }));
      res.json(parsedRows);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

  // --- CAIXA FLUXO ---

  // Mesas
  app.get('/api/mesas', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [rows] = await pool.query('SELECT * FROM mesas WHERE tenant_id = ? ORDER BY numero', [tenantId]);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/mesas', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { numero, qrCode } = req.body;
      const [result]: any = await pool.query(
        'INSERT INTO mesas (tenant_id, numero, qrCode) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qrCode = VALUES(qrCode)',
        [tenantId, numero, qrCode]
      );
      res.json({ success: true, id: result.insertId });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: `A mesa ${req.body.numero} já existe.` });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/mesas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      const { numero, qrCode } = req.body;
      await pool.query(
        'UPDATE mesas SET numero = ?, qrCode = ? WHERE id = ? AND tenant_id = ?',
        [numero, qrCode, id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: `O número de mesa ${req.body.numero} já está em uso.` });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/mesas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      await pool.query('DELETE FROM mesas WHERE id = ? AND tenant_id = ?', [id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reservas
  app.get('/api/reservas', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [rows]: any = await pool.query(
        `SELECT r.*, m.numero as mesaNumero 
         FROM reservas r 
         LEFT JOIN mesas m ON r.mesaId = m.id 
         WHERE r.tenant_id = ? 
         ORDER BY r.data, r.hora`,
        [tenantId]
      );
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/reservas', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { mesaId, clienteNome, data, hora, pessoas, status, observacoes } = req.body;
      const [result]: any = await pool.query(
        'INSERT INTO reservas (tenant_id, mesaId, clienteNome, data, hora, pessoas, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, mesaId, clienteNome, data, hora, pessoas, status || 'pendente', observacoes]
      );
      res.json({ success: true, id: result.insertId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/reservas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      const { mesaId, clienteNome, data, hora, pessoas, status, observacoes } = req.body;
      await pool.query(
        'UPDATE reservas SET mesaId = ?, clienteNome = ?, data = ?, hora = ?, pessoas = ?, status = ?, observacoes = ? WHERE id = ? AND tenant_id = ?',
        [mesaId, clienteNome, data, hora, pessoas, status, observacoes, id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/reservas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      await pool.query('DELETE FROM reservas WHERE id = ? AND tenant_id = ?', [id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/caixa/status', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [rows]: any = await pool.query(
        'SELECT * FROM caixa_fluxo WHERE tenant_id = ? AND status = "aberto" ORDER BY dataAbertura DESC LIMIT 1',
        [tenantId]
      );
      res.json(rows[0] || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/caixa/abrir', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { username, password, valorInicial, userName } = req.body;

      // Verify Admin Password or User with 'caixa' permission
      const [userRows]: any = await pool.query(
        'SELECT password, role, permissions FROM users WHERE username = ? AND tenant_id = ?',
        [username, tenantId]
      );
      
      let isAuthorized = false;
      let passwordMatch = false;

      if (userRows.length > 0) {
        const u = userRows[0];
        const perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || {});
        
        // Allowed if admin, superadmin OR has explicit 'caixa' permission
        if (u.role === 'admin' || u.role === 'superadmin' || perms.caixa === true) {
          isAuthorized = true;
          passwordMatch = await bcrypt.compare(password, u.password);
          if (!passwordMatch) {
            // Fallback for plain text
            passwordMatch = (password === u.password);
          }
        }
      }

      // Check tenant table as well if not found/matched in users (Admin/Owner)
      if (!passwordMatch) {
         const [tRows]: any = await pool.query('SELECT password FROM tenants WHERE id = ?', [tenantId]);
         if (tRows.length > 0 && tRows[0].password === password) {
           isAuthorized = true;
           passwordMatch = true;
         }
      }

      if (!isAuthorized || !passwordMatch) {
        return res.status(401).json({ error: 'Você não tem permissão para autorizar a abertura do caixa ou a senha está incorreta.' });
      }

      // Check if already open
      const [openRows]: any = await pool.query(
        'SELECT id FROM caixa_fluxo WHERE tenant_id = ? AND status = "aberto"',
        [tenantId]
      );
      if (openRows.length > 0) {
        return res.status(400).json({ error: 'Já existe um caixa aberto para esta empresa.' });
      }

      const [result]: any = await pool.query(
        'INSERT INTO caixa_fluxo (tenant_id, userId, userName, status, valorInicial, dataAbertura) VALUES (?, ?, ?, "aberto", ?, ?)',
        [tenantId, username, userName, valorInicial, Date.now()]
      );

      res.json({ success: true, id: result.insertId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/caixa/fechar', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id, valorFinal, observacoes } = req.body;

      await pool.query(
        'UPDATE caixa_fluxo SET status = "fechado", valorFinal = ?, dataFechamento = ?, observacoes = ? WHERE id = ? AND tenant_id = ?',
        [valorFinal, Date.now(), observacoes, id, tenantId]
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/caixa/historico', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [rows]: any = await pool.query(
        'SELECT * FROM caixa_fluxo WHERE tenant_id = ? ORDER BY dataAbertura DESC LIMIT 30',
        [tenantId]
      );
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado. Verifique as configurações no menu Settings -> Secrets.' });
      const { id, username, password, name, email, whatsapp, role, permissions, waiterConfig, kitchenCode, isNewTenant, tenantName, tenantId: bodyTenantId, trialDays, skipStripeSubscription } = req.body;
      
      const finalTenantId = isNewTenant ? (bodyTenantId || id) : tenantId;

      if (!finalTenantId) return res.status(400).json({ error: 'Tenant ID ausente' });

      // Check if email already exists globally
      if (email) {
        const [existingEmail]: any = await pool.query('SELECT id FROM users WHERE email = ? AND (tenant_id != ? OR username != ?)', [email, finalTenantId, username]);
        if (existingEmail.length > 0) {
          return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
        }
      }

      // Hash password
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      } else if (role === 'cook' && kitchenCode) {
        hashedPassword = await bcrypt.hash(kitchenCode, 10);
      } else {
        // For other roles, password is required
        return res.status(400).json({ error: 'Senha é obrigatória' });
      }

      if (isNewTenant) {
        // Validate tenantId is exactly 8 digits
        if (!/^\d{8}$/.test(finalTenantId)) {
          return res.status(400).json({ error: 'O ID da empresa deve conter exatamente 8 números.' });
        }

        // Check if tenant already exists
        const [existingTenants]: any = await pool.query('SELECT id FROM tenants WHERE id = ?', [finalTenantId]);
        if (existingTenants.length > 0) {
          return res.status(409).json({ error: 'Este ID de empresa já está em uso. Por favor, escolha outro.' });
        }
        
        // Simplified tenant creation without Stripe
        const isActive = true;
        const subStatus = 'active';
        const menuCode = await generateMenuCode();

        await pool.query(
          'INSERT INTO tenants (id, name, slug, email, password, whatsapp, active, subscription_status, menu_code, permissions, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))', 
          [finalTenantId, tenantName || name, finalTenantId, email || null, password || null, whatsapp || null, isActive, subStatus, menuCode, JSON.stringify(permissions || {}), trialDays || 30]
        );
      }

      const finalUserId = id || Date.now().toString();

      await pool.query(
        'INSERT INTO users (id, tenant_id, username, password, name, email, role, permissions, waiterConfig, kitchenCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=?, password=?, name=?, email=?, role=?, permissions=?, waiterConfig=?, kitchenCode=?',
        [
          finalUserId, 
          finalTenantId, 
          username, 
          hashedPassword, 
          name, 
          email || null, 
          role, 
          JSON.stringify(permissions || {}), 
          JSON.stringify(waiterConfig || null),
          kitchenCode || null,
          username, 
          hashedPassword, 
          name, 
          email || null, 
          role, 
          JSON.stringify(permissions || {}), 
          JSON.stringify(waiterConfig || null),
          kitchenCode || null
        ]
      );
      res.json({ success: true, id: finalUserId, tenantId: finalTenantId });
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

  app.put('/api/users/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const fields = { ...req.body };
      
      if (fields.password) {
        fields.password = await bcrypt.hash(fields.password, 10);
      }

      const keys = Object.keys(fields).filter(k => k !== 'tenant_id' && k !== 'id');
      if (keys.length === 0) return res.json({ success: true });

      const setClause = keys.map(key => `\`${key}\`=?`).join(', ');
      const values = keys.map(key => (key === 'permissions' || key === 'waiterConfig') ? JSON.stringify(fields[key] || null) : fields[key]);
      
      await pool.query(`UPDATE users SET ${setClause} WHERE id=? AND tenant_id=?`, [...values, req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/produtos', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM produtos WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/produtos', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { nome, preco, tempo, imagem, categoria, descricao } = req.body;
    await pool.query('INSERT INTO produtos (tenant_id, nome, preco, tempo, imagem, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)', [tenantId, nome, preco, tempo, imagem, categoria, descricao]);
    res.json({ success: true });
  });

  app.put('/api/produtos/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { nome, preco, tempo, imagem, categoria, descricao } = req.body;
      await pool.query(
        'UPDATE produtos SET nome=?, preco=?, tempo=?, imagem=?, categoria=?, descricao=? WHERE id=? AND tenant_id=?',
        [nome, preco, tempo, imagem, categoria, descricao, req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/produtos/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM produtos WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/clientes', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM clientes WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/clientes', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { codigo, nome, empresa, tel, cpf } = req.body;
    await pool.query('INSERT INTO clientes (tenant_id, codigo, nome, empresa, tel, cpf) VALUES (?, ?, ?, ?, ?, ?)', [tenantId, codigo, nome, empresa, tel, cpf]);
    res.json({ success: true });
  });

  app.put('/api/clientes/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { codigo, nome, empresa, tel, cpf } = req.body;
      await pool.query(
        'UPDATE clientes SET codigo=?, nome=?, empresa=?, tel=?, cpf=? WHERE id=? AND tenant_id=?',
        [codigo, nome, empresa, tel, cpf, req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/clientes/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM clientes WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/vendas', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM vendas WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/vendas', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { clienteId, desc, valor, data, pago, formaPagamento } = req.body;
    await pool.query('INSERT INTO vendas (tenant_id, clienteId, `desc`, valor, data, pago, formaPagamento) VALUES (?, ?, ?, ?, ?, ?, ?)', [tenantId, clienteId, desc, valor, data, pago, formaPagamento]);
    res.json({ success: true });
  });

  app.put('/api/vendas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { clienteId, desc, valor, data, pago, formaPagamento } = req.body;
      await pool.query(
        'UPDATE vendas SET clienteId=?, `desc`=?, valor=?, data=?, pago=?, formaPagamento=? WHERE id=? AND tenant_id=?',
        [clienteId, desc, valor, data, pago, formaPagamento, req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/vendas/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM vendas WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/pedidos', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM pedidos_online WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/pedidos', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { 
      timestamp, tempoPreparo, codigoComanda, hora, identificacao, itens, total, status, origem, formaPagamento, 
      waiterId, commissionValue, isExtra,
      cookStartedId, cookStartedName, cookFinishedId, cookFinishedName, paymentWaiterId, paymentWaiterName
    } = req.body;
    await pool.query(
      'INSERT INTO pedidos_online (tenant_id, timestamp, tempoPreparo, codigoComanda, hora, identificacao, itens, total, status, origem, formaPagamento, waiterId, commissionValue, isExtra, cookStartedId, cookStartedName, cookFinishedId, cookFinishedName, paymentWaiterId, paymentWaiterName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tenantId, timestamp, tempoPreparo, codigoComanda, hora, identificacao, JSON.stringify(itens), total, status, origem, formaPagamento, 
        waiterId, commissionValue, isExtra,
        cookStartedId || null, cookStartedName || null, cookFinishedId || null, cookFinishedName || null, paymentWaiterId || null, paymentWaiterName || null
      ]
    );
    res.json({ success: true });
  });

  app.put('/api/pedidos/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const fields = req.body;
      const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'tenant_id');
      if (keys.length === 0) return res.json({ success: true });

      const setClause = keys.map(key => `\`${key}\`=?`).join(', ');
      const values = keys.map(key => (key === 'itens') ? JSON.stringify(fields[key]) : fields[key]);

      await pool.query(`UPDATE pedidos_online SET ${setClause} WHERE id=? AND tenant_id=?`, [...values, req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/estoque', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM estoque WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/estoque', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { nome, qtd, validade } = req.body;
    await pool.query('INSERT INTO estoque (tenant_id, nome, qtd, validade) VALUES (?, ?, ?, ?)', [tenantId, nome, qtd, validade]);
    res.json({ success: true });
  });

  app.put('/api/estoque/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { nome, qtd, validade } = req.body;
      await pool.query(
        'UPDATE estoque SET nome=?, qtd=?, validade=? WHERE id=? AND tenant_id=?',
        [nome, qtd, validade, req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/estoque/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM estoque WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Categorias
  app.get('/api/categorias', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows] = await pool.query('SELECT * FROM categorias WHERE tenant_id = ?', [tenantId]);
    res.json(rows);
  });

  app.post('/api/categorias', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { id, nome } = req.body;
    await pool.query('INSERT INTO categorias (id, tenant_id, nome) VALUES (?, ?, ?)', [id, tenantId, nome]);
    res.json({ success: true });
  });

  app.delete('/api/categorias/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM categorias WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delivery Configs
  app.get('/api/delivery-configs', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows]: any = await pool.query('SELECT * FROM delivery_configs WHERE tenant_id = ?', [tenantId]);
    res.json(rows.map((r: any) => ({ ...r, active: !!r.active, settings: typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings || {}) })));
  });

  app.post('/api/delivery-configs', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { platform, apiKey, apiSecret, merchantId, active, settings } = req.body;
    await pool.query(
      'INSERT INTO delivery_configs (tenant_id, platform, apiKey, apiSecret, merchantId, active, settings) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, platform, apiKey, apiSecret, merchantId, active, JSON.stringify(settings || {})]
    );
    res.json({ success: true });
  });

  app.put('/api/delivery-configs/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { platform, apiKey, apiSecret, merchantId, active, settings } = req.body;
      await pool.query(
        'UPDATE delivery_configs SET platform=?, apiKey=?, apiSecret=?, merchantId=?, active=?, settings=? WHERE id=? AND tenant_id=?',
        [platform, apiKey, apiSecret, merchantId, active, JSON.stringify(settings || {}), req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/delivery-configs/:id', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      await pool.query('DELETE FROM delivery_configs WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Site Config
  app.get('/api/site-config', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows]: any = await pool.query('SELECT * FROM site_config WHERE tenant_id = ?', [tenantId]);
    if (rows.length > 0) {
      const row = rows[0];
      row.menuImages = typeof row.menuImages === 'string' ? JSON.parse(row.menuImages) : (row.menuImages || []);
      row.categoryOrder = typeof row.categoryOrder === 'string' ? JSON.parse(row.categoryOrder) : (row.categoryOrder || []);
      row.useDigitalMenu = !!row.useDigitalMenu;
      row.autoCategoryOrder = !!row.autoCategoryOrder;
      row.showLogo = row.showLogo !== undefined ? !!row.showLogo : true;
      res.json(row);
    } else {
      res.json({ 
        banner: null, logo: null, description: '', useDigitalMenu: true, menuImages: [],
        primaryColor: '#2563eb', backgroundColor: '#f9fafb', videoUrl: '', customName: '',
        categoryOrder: [], autoCategoryOrder: true, showLogo: true
      });
    }
  });

  app.post('/api/site-config', checkTenantActive, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { 
        banner, logo, description, useDigitalMenu, menuImages, 
        primaryColor, backgroundColor, videoUrl, customName, 
        categoryOrder, autoCategoryOrder, showLogo 
      } = req.body;
      
      await pool.query(
        `INSERT INTO site_config (
          tenant_id, banner, logo, description, useDigitalMenu, menuImages, 
          primaryColor, backgroundColor, videoUrl, customName, 
          categoryOrder, autoCategoryOrder, showLogo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          banner=?, logo=?, description=?, useDigitalMenu=?, menuImages=?, 
          primaryColor=?, backgroundColor=?, videoUrl=?, customName=?, 
          categoryOrder=?, autoCategoryOrder=?, showLogo=?`,
        [
          tenantId, banner, logo, description, useDigitalMenu, JSON.stringify(menuImages || []), 
          primaryColor, backgroundColor, videoUrl, customName, 
          JSON.stringify(categoryOrder || []), autoCategoryOrder, showLogo,
          banner, logo, description, useDigitalMenu, JSON.stringify(menuImages || []), 
          primaryColor, backgroundColor, videoUrl, customName, 
          JSON.stringify(categoryOrder || []), autoCategoryOrder, showLogo
        ]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public Menu Route (No Auth required, but needs tenantId or menuCode)
  app.get('/api/public/menu/:tenantId', async (req, res) => {
    let { tenantId } = req.params;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    
    try {
      // Find real tenant ID by checking both menu_code and id
      const [tenants]: any = await pool.query(
        'SELECT id FROM tenants WHERE menu_code = ? OR id = ?', 
        [tenantId, tenantId]
      );
      
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
      } else {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const [configRows]: any = await pool.query('SELECT * FROM site_config WHERE tenant_id = ?', [tenantId]);
      const [produtos]: any = await pool.query('SELECT * FROM produtos WHERE tenant_id = ?', [tenantId]);
      const [categorias]: any = await pool.query('SELECT * FROM categorias WHERE tenant_id = ?', [tenantId]);
      const [restaurante]: any = await pool.query('SELECT name FROM tenants WHERE id = ?', [tenantId]);

      const config = configRows[0] || { 
        banner: null, logo: null, description: '', useDigitalMenu: true, menuImages: [],
        primaryColor: '#2563eb', backgroundColor: '#f9fafb', videoUrl: '', customName: '',
        categoryOrder: [], autoCategoryOrder: true, showLogo: true
      };
      if (typeof config.menuImages === 'string') config.menuImages = JSON.parse(config.menuImages);
      if (typeof config.categoryOrder === 'string') config.categoryOrder = JSON.parse(config.categoryOrder);
      config.useDigitalMenu = !!config.useDigitalMenu;
      config.autoCategoryOrder = !!config.autoCategoryOrder;
      config.showLogo = config.showLogo !== undefined ? !!config.showLogo : true;

      res.json({
        restaurante: restaurante[0]?.name || 'Restaurante',
        config,
        produtos,
        categorias
      });
    } catch (error: any) {
      console.error('Erro ao buscar cardápio público:', error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

  app.get('/api/config', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const [rows]: any = await pool.query('SELECT * FROM config WHERE tenant_id = ?', [tenantId]);
    if (rows.length > 0) {
      const row = rows[0];
      row.kitchen_skip_start = !!row.kitchen_skip_start;
      res.json(row);
    } else {
      res.json({ pix: '', beneficiario: '', nomeBanco: '', obs: '', kitchen_skip_start: false });
    }
  });

  app.post('/api/config', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { pix, beneficiario, nomeBanco, obs, kitchen_skip_start, fiscal } = req.body;
    await pool.query(
      'INSERT INTO config (tenant_id, pix, beneficiario, nomeBanco, obs, kitchen_skip_start, fiscal) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE pix=?, beneficiario=?, nomeBanco=?, obs=?, kitchen_skip_start=?, fiscal=?',
      [tenantId, pix, beneficiario, nomeBanco, obs, kitchen_skip_start || false, JSON.stringify(fiscal || null), pix, beneficiario, nomeBanco, obs, kitchen_skip_start || false, JSON.stringify(fiscal || null)]
    );
    res.json({ success: true });
  });

  app.post('/api/fiscal/emitir-nfce', checkTenantActive, async (req, res) => {
    const tenantId = getTenantId(req);
    const { pedidoId } = req.body;
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });

    try {
      // 1. Get order details
      const [pedidos]: any = await pool.query('SELECT * FROM pedidos_online WHERE tenant_id = ? AND id = ?', [tenantId, pedidoId]);
      if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      const pedido = pedidos[0];

      // 2. Get fiscal config
      const [configs]: any = await pool.query('SELECT fiscal FROM config WHERE tenant_id = ?', [tenantId]);
      if (configs.length === 0 || !configs[0].fiscal) {
        return res.status(400).json({ error: 'Configuração fiscal não encontrada' });
      }
      const fiscalConfig = typeof configs[0].fiscal === 'string' ? JSON.parse(configs[0].fiscal) : configs[0].fiscal;

      if (!fiscalConfig || !fiscalConfig.tokenApi) {
        return res.status(400).json({ error: 'Token da API Fiscal não configurado' });
      }

      // 3. Simulate NFC-e emission
      console.log(`Simulando emissão de NFC-e para o pedido ${pedidoId} do tenant ${tenantId}`);
      
      // Mock success
      const chave = `352304000000000000006500100000000110000000${Math.floor(10 + Math.random() * 89)}`;
      const protocolo = `13523000000000${Math.floor(1 + Math.random() * 9)}`;

      // 4. Save to database
      await pool.query(
        'UPDATE pedidos_online SET fiscal_chave = ?, fiscal_protocolo = ? WHERE id = ?',
        [chave, protocolo, pedidoId]
      );

      res.json({ 
        success: true, 
        chave,
        protocolo
      });
    } catch (err: any) {
      console.error('Erro ao emitir NFC-e:', err);
      res.status(500).json({ error: err.message || 'Erro interno ao emitir NFC-e' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { username, password, tenantId } = req.body;
      
      // 1. Tentar login via tabela 'tenants' (como Admin/Dono usando E-mail)
      // O username pode ser o e-mail
      const [tenantRows]: any = await pool.query('SELECT * FROM tenants WHERE email = ?', [username]);
      const tenantUser = tenantRows[0];

      if (tenantUser) {
        // 2. Verifique se a conta está ativa (Bloqueio Master Central)
        if (tenantUser.active === 0) {
          return res.status(403).json({ 
            error: "Sua conta está SUSPENSA. Entre em contato com o suporte.",
            suspended: true,
            tenantName: tenantUser.name,
            tenantId: tenantUser.id
          });
        }

        // 3. Verifique se o período de uso expirou
        if (tenantUser.trial_ends_at) {
          const expirationDate = new Date(tenantUser.trial_ends_at);
          if (expirationDate.getTime() < Date.now()) {
            return res.status(403).json({ 
              error: 'Seu período de uso expirou. Por favor, entre em contato com o administrador para renovar sua licença.',
              needsPayment: true 
            });
          }
        }

        // 4. Login Permitido como Admin do Tenant
        if (tenantUser.password === password) {
          // DEFAULTS consistent with App.tsx IDs
          let permsObj: Record<string, boolean> = {
            'cartão': true, 'cadastro': true, 'irmão': true, 'fazerOrdem': true, 
            'pedidosQr': true, 'baixaCozinha': true, 'relacional': true, 'gráficos': true, 
            'configurar': true, 'estoque': true, 'painelCliente': true, 'gmeas': true, 
            'siteQr': true, 'entrega': true, 'porquinho': true, 'caixa': true, 'usuários': true, 
            'usuários de cozinha': true, 'promotor fiscal': true
          };
          
          if (tenantUser.permissions) {
            try {
              const dbPerms = typeof tenantUser.permissions === 'string' 
                ? JSON.parse(tenantUser.permissions) 
                : tenantUser.permissions;
              
              if (dbPerms && typeof dbPerms === 'object' && !Array.isArray(dbPerms)) {
                permsObj = { ...permsObj, ...dbPerms };
              } else if (Array.isArray(dbPerms)) {
                // Compatibility with legacy array permissions
                dbPerms.forEach((k: string) => { permsObj[k] = true; });
              }
            } catch (e) {
              console.error('Erro ao processar permissões do tenant:', e);
            }
          }

          const user = {
            id: 'admin-' + tenantUser.id,
            tenant_id: tenantUser.id,
            username: tenantUser.email,
            name: tenantUser.name,
            email: tenantUser.email,
            role: 'admin',
            permissions: permsObj,
            trial_ends_at: tenantUser.trial_ends_at
          };
          return res.json({ success: true, user });
        } else {
          // Se encontrou o tenant mas a senha está errada, não continuamos para 'users'
          // para evitar ambiguidade se houver um usuário com mesmo e-mail
          return res.status(401).json({ error: 'Senha inválida.' });
        }
      }

      // Se não encontrou na tabela tenants, tenta login via tabela 'users' (Funcionários)
      if (!tenantId) {
        // No login de funcionário, o tenantId é obrigatório se não for login por e-mail de admin
        return res.status(400).json({ error: 'ID da empresa é obrigatório para este tipo de acesso' });
      }

      const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ? AND tenant_id = ?', [username, tenantId]);
      let user = rows[0];

      // Verificação de status do Tenant antes de permitir login de funcionários
      if (tenantId && tenantId !== 'system') {
        const [tenants]: any = await pool.query('SELECT active, name FROM tenants WHERE id = ?', [tenantId]);
        if (tenants.length > 0 && tenants[0].active === 0) {
          return res.status(403).json({ 
            error: "Sua conta está SUSPENSA. Entre em contato com o suporte.",
            suspended: true,
            tenantName: tenants[0].name,
            tenantId: tenantId
          });
        }
      }

      // Auto-create or reset superadmin if it's the master login
      if ((username === 'admin' || username === 'superadmin') && tenantId === 'system' && password === 'master123') {
        const hashedPassword = await bcrypt.hash('master123', 10);
        // Use INSERT IGNORE to avoid error if system tenant already exists
        await pool.query('INSERT IGNORE INTO tenants (id, name, slug, active) VALUES (?, ?, ?, ?)', ['system', 'Sistema Master', 'system', true]);
        
        if (!user) {
          const id = Date.now().toString();
          await pool.query(
            'INSERT INTO users (id, tenant_id, username, password, name, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, 'system', username, hashedPassword, 'Super Admin', 'superadmin', JSON.stringify({ 'superadmin': true })]
          );
          const [newRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
          user = newRows[0];
        } else {
          // If user exists but password might be different, update it to ensure master123 works
          await pool.query('UPDATE users SET password = ?, role = ? WHERE id = ?', [hashedPassword, 'superadmin', user.id]);
          user.password = hashedPassword;
          user.role = 'superadmin';
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        // Fallback for plain text passwords (optional, for migration)
        if (password !== user.password) {
          return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
      }

      // Check if tenant is active
      const [tenants]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
      let trialEndDate = null;
      if (tenants.length > 0) {
        const tenant = tenants[0];
        trialEndDate = tenant.trial_ends_at;
        const expirationDate = trialEndDate ? new Date(trialEndDate) : null;
        const isTrialActive = expirationDate && expirationDate.getTime() > Date.now();
        const hasActiveSubscription = tenant.subscription_status === 'active' || tenant.subscription_status === 'trialing';
        
        const isSuspended = !tenant.active && !isTrialActive && !hasActiveSubscription;

        if (isSuspended) {
          // Se a conta estiver suspensa, permitimos o login para que o App exiba a tela de bloqueio
        }
      }

      // Parse JSON fields safely
      const safeParse = (val: any, fallback: any) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return fallback; }
        }
        return val || fallback;
      };

      user.permissions = safeParse(user.permissions, {});
      user.waiterConfig = safeParse(user.waiterConfig, {});
      user.trial_ends_at = trialEndDate;
      delete user.password; // Don't send password to client

      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

  // Forgot Password Flow
  app.post('/api/forgot-password', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { email, tenantId } = req.body;
      
      if (!email || !tenantId) return res.status(400).json({ error: 'E-mail e ID da empresa são obrigatórios' });

      // Check if user exists
      const [users]: any = await pool.query('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
      if (users.length === 0) {
        console.log(`[PASS_RESET_FAIL] Usuário não encontrado para e-mail: ${email} e tenantId: ${tenantId}`);
        // We return success anyway to avoid email enumeration
        return res.json({ success: true, message: 'Se o e-mail existir, um código será enviado.' });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save code
      await pool.query(
        'INSERT INTO password_resets (email, tenant_id, code, expires_at) VALUES (?, ?, ?, ?)',
        [email, tenantId, code, expiresAt]
      );

      // Send email
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: (process.env.SMTP_PASS || '').replace(/\s/g, '') // Remove spaces from App Password
        }
      };

      if (smtpConfig.auth.user && smtpConfig.auth.pass) {
        try {
          const transporterConfig: any = {
            auth: smtpConfig.auth
          };

          if (smtpConfig.host === 'smtp.gmail.com') {
            transporterConfig.service = 'gmail';
          } else {
            transporterConfig.host = smtpConfig.host;
            transporterConfig.port = smtpConfig.port;
            transporterConfig.secure = smtpConfig.secure;
          }

          const transporter = nodemailer.createTransport({
            ...transporterConfig,
            tls: {
              rejectUnauthorized: false
            }
          });
          
          await transporter.sendMail({
            from: `"Suporte" <${smtpConfig.auth.user}>`,
            to: email,
            subject: 'Código de Recuperação de Senha',
            text: `Seu código de recuperação é: ${code}. Ele expira em 15 minutos.`,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>Recuperação de Senha</h2>
              <p>Você solicitou a recuperação de sua senha. Use o código abaixo para continuar:</p>
              <div style="font-size: 32px; font-weight: bold; padding: 20px; background: #f4f4f4; border-radius: 10px; text-align: center; letter-spacing: 5px;">
                ${code}
              </div>
              <p>Este código expira em 15 minutos.</p>
              <p>Se você não solicitou isso, ignore este e-mail.</p>
            </div>`
          });
          console.log(`[EMAIL_SUCCESS] Código enviado para ${email}`);
        } catch (emailErr: any) {
          console.error('[EMAIL_ERROR] Falha ao enviar e-mail:', emailErr);
          // Fallback to console if email fails
          console.log(`[PASS_RESET_FALLBACK] Código para ${email} (${tenantId}): ${code}`);
          // Return error if email fails so user knows
          return res.status(500).json({ error: `Falha ao enviar e-mail: ${emailErr.message}. Verifique as configurações de SMTP.` });
        }
      } else {
        console.log(`[PASS_RESET] Código para ${email} (${tenantId}): ${code}`);
        return res.status(500).json({ error: 'Configurações de e-mail (SMTP) não encontradas.' });
      }

      res.json({ success: true, message: 'Código enviado com sucesso.' });
    } catch (error: any) {
      console.error('Erro no forgot-password:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/verify-reset-code', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { email, tenantId, code } = req.body;
      
      const [rows]: any = await pool.query(
        'SELECT * FROM password_resets WHERE email = ? AND tenant_id = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email, tenantId, code]
      );

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Código inválido ou expirado.' });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { email, tenantId, code, newPassword } = req.body;
      
      // Verify code again
      const [rows]: any = await pool.query(
        'SELECT * FROM password_resets WHERE email = ? AND tenant_id = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email, tenantId, code]
      );

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Código inválido ou expirado.' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await pool.query(
        'UPDATE users SET password = ? WHERE email = ? AND tenant_id = ?',
        [hashedPassword, email, tenantId]
      );

      // Delete the code
      await pool.query('DELETE FROM password_resets WHERE email = ? AND tenant_id = ?', [email, tenantId]);

      res.json({ success: true, message: 'Senha alterada com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Middleware to check if user is superadmin
  const checkSuperAdmin = async (req: any, res: any, next: any) => {
    const tenantId = getTenantId(req);
    const username = req.headers['x-username']; // We should pass this from client
    
    if (tenantId === 'system') return next(); // Basic check, ideally use JWT
    
    // For now, we'll rely on the tenantId being 'system' for admin routes
    // In a real app, we'd verify a session or token
    if (tenantId !== 'system') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };

  // Super Admin Routes
  app.get('/api/admin/tenants', checkSuperAdmin, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [rows] = await pool.query(`
        SELECT t.*, u.username, u.email, u.name as admin_name 
        FROM tenants t 
        LEFT JOIN users u ON t.id = u.tenant_id AND u.role = 'admin'
        ORDER BY t.created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      console.error('Erro ao buscar tenants:', err);
      res.status(500).json({ error: err.message || 'Erro ao buscar tenants' });
    }
  });

  app.put('/api/admin/tenants/:id/status', checkSuperAdmin, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      const { active } = req.body;
      
      if (id === 'system') return res.status(400).json({ error: 'Não é possível desativar o sistema' });
      
      await pool.query('UPDATE tenants SET active = ? WHERE id = ?', [active, id]);
      tenantCache.delete(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Erro ao atualizar status do tenant:', err);
      res.status(500).json({ error: err.message || 'Erro ao atualizar status' });
    }
  });

  app.delete('/api/admin/tenants/:id', checkSuperAdmin, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const { id } = req.params;
      
      if (id === 'system') return res.status(403).json({ error: 'Não é possível excluir o tenant do sistema' });
      
      // Delete all data associated with this tenant
      const tables = ['users', 'produtos', 'clientes', 'vendas', 'pedidos_online', 'estoque', 'config', 'tenants'];
      for (const table of tables) {
        const column = table === 'tenants' ? 'id' : 'tenant_id';
        try {
          await pool.query(`DELETE FROM ${table} WHERE ${column} = ?`, [id]);
        } catch (tableErr) {
          console.warn(`Aviso: Erro ao deletar da tabela ${table}:`, tableErr);
        }
      }
      
      tenantCache.delete(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Erro ao excluir tenant:', err);
      res.status(500).json({ error: err.message || 'Erro ao excluir tenant' });
    }
  });

  app.put('/api/admin/tenants/:id', checkSuperAdmin, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
    const { id } = req.params;
    const { name, adminName, adminEmail, adminUsername, adminPassword, trialDays, permissions } = req.body;

    try {
      // Update tenant
      let tenantUpdateQuery = 'UPDATE tenants SET name = ?';
      let tenantParams: any[] = [name];

      if (adminEmail) {
        tenantUpdateQuery += ', email = ?';
        tenantParams.push(adminEmail);
      }
      if (adminPassword) {
        tenantUpdateQuery += ', password = ?';
        tenantParams.push(adminPassword);
      }
      if (trialDays) {
        tenantUpdateQuery += ', trial_ends_at = DATE_ADD(NOW(), INTERVAL ? DAY)';
        tenantParams.push(trialDays);
      }
      if (permissions) {
        tenantUpdateQuery += ', permissions = ?';
        tenantParams.push(JSON.stringify(permissions));
      }

      tenantUpdateQuery += ' WHERE id = ?';
      tenantParams.push(id);
      await pool.query(tenantUpdateQuery, tenantParams);

      tenantCache.delete(id);

      // Update admin user
      const [adminUsers]: any = await pool.query('SELECT id FROM users WHERE tenant_id = ? AND role = "admin"', [id]);
      if (adminUsers.length > 0) {
        const adminId = adminUsers[0].id;
        let updateQuery = 'UPDATE users SET name = ?, email = ?, username = ?';
        let params = [adminName, adminEmail, adminUsername];

        if (adminPassword) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          updateQuery += ', password = ?';
          params.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        params.push(adminId);
        await pool.query(updateQuery, params);
      }

      // Update trial if provided
      if (trialDays !== undefined) {
        const date = new Date();
        date.setDate(date.getDate() + Number(trialDays));
        await pool.query('UPDATE tenants SET trial_ends_at = ? WHERE id = ?', [date, id]);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

  app.get('/api/admin/stats', checkSuperAdmin, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Banco de dados não conectado' });
      const [tenants]: any = await pool.query('SELECT COUNT(*) as count FROM tenants');
      const [users]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      const [vendas]: any = await pool.query('SELECT SUM(valor) as total FROM vendas');
      res.json({
        totalTenants: tenants[0]?.count || 0,
        totalUsers: users[0]?.count || 0,
        totalRevenue: vendas[0]?.total || 0
      });
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas:', err);
      res.status(500).json({ error: err.message || 'Erro ao buscar estatísticas' });
    }
  });

  // JSON 404 for API routes
  app.all('/api/*all', (req, res) => {
    res.status(404).json({ 
      error: `Rota API não encontrada: ${req.method} ${req.originalUrl}` 
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ [Global Error Handler]:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Erro interno do servidor',
      path: req.originalUrl
    });
  });

  // Rota para o Painel Administrativo Standalone
  app.get('/admin', (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
      res.redirect('/admin.html');
    } else {
      const distPath = currentDir;
      const adminPath = path.join(distPath, 'admin.html');
      if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
      } else {
        res.status(404).send('Painel Administrativo não encontrado. Execute o build primeiro.');
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = currentDir;
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('*all', (req, res) => {
        res.status(404).send('Application build not found. Please run npm run build.');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
