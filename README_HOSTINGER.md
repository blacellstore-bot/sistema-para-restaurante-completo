# Guia de Implantação na Hostinger

Este projeto está pronto para ser implantado na Hostinger usando o **Node.js Selector**.

## Passos para Implantação:

1.  **Gerar o Build do Frontend:**
    No terminal do AI Studio, execute:
    ```bash
    npm run build
    ```
    Isso criará a pasta `dist` com os arquivos estáticos.

2.  **Preparar os Arquivos:**
    Você precisará enviar os seguintes arquivos/pastas para a Hostinger:
    -   `dist/` (pasta gerada pelo build)
    -   `server.ts` (o servidor backend)
    -   `package.json`
    -   `.env` (crie este arquivo na Hostinger com as credenciais do banco)

3.  **Configurar o Node.js na Hostinger:**
    -   Vá ao painel da Hostinger -> **Node.js**.
    -   Crie uma nova aplicação.
    -   **Application Root:** Onde você enviou os arquivos (ex: `/public_html`).
    -   **Application URL:** Seu domínio.
    -   **Application Startup File:** `dist/server.cjs`
    -   **Versão do Node:** Recomenda-se 18 ou superior.

4.  **Variáveis de Ambiente:**
    No painel da Hostinger, adicione as seguintes variáveis de ambiente:
    -   `DB_HOST`: 193.203.175.252
    -   `DB_USER`: u825216031_Hoho3838
    -   `DB_PASS`: vT3Z3NQy>ta^
    -   `DB_NAME`: u825216031_Hoho3838
    -   `STRIPE_SECRET_KEY`: (Sua chave secreta do Stripe)
    -   `STRIPE_WEBHOOK_SECRET`: (Seu segredo de webhook do Stripe)
    -   `STRIPE_PRICE_ID`: (Seu ID de preço do Stripe)
    -   `APP_URL`: (A URL do seu site na Hostinger)
    -   `NODE_ENV`: `production`

5.  **Instalar Dependências:**
    No painel da Hostinger, clique em **Run npm install**.

6.  **Iniciar a Aplicação:**
    Clique em **Start App**.

## Observações Importantes:
-   O servidor está configurado para servir os arquivos da pasta `dist` automaticamente quando `NODE_ENV=production`.
-   Certifique-se de que o banco de dados MySQL na Hostinger permite conexões do host onde o Node.js está rodando.
-   Se a Hostinger não suportar a execução direta de `.ts` com `tsx`, você pode precisar compilar o `server.ts` para `server.js` usando `esbuild` ou `tsc`.

### Compilando o servidor (se necessário):
Se o `tsx` não funcionar na Hostinger, execute no AI Studio:
```bash
npx esbuild server.ts --bundle --platform=node --outfile=dist/server.cjs --external:vite --external:mysql2 --external:bcryptjs --external:stripe
```
E use `dist/server.cjs` como o **Application Startup File**.
