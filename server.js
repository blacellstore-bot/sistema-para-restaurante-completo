// Arquivo de entrada principal para a Hostinger
// A Hostinger geralmente procura por um arquivo server.js na raiz do projeto.
// Este arquivo simplesmente redireciona para o servidor compilado na pasta dist.

import('./dist/server.cjs').catch(error => {
  console.error("===============================================================");
  console.error("ERRO CRÍTICO: A pasta 'dist' ou o arquivo 'dist/server.cjs' não foi encontrado!");
  console.error("Isso significa que o projeto não foi compilado (build).");
  console.error("Detalhes do erro:", error.message);
  console.error("===============================================================");
  process.exit(1);
});
