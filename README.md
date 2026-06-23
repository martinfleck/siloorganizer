# SiloOrganizer - Analisador de Canibalização de Keywords

## Descrição
Ferramenta para análise de canibalização de palavras-chave, agrupando keywords similares baseado em sobreposição de resultados de SERP.

## Como Funciona a Análise de Canibalização?

O **SiloOrganizer** ajuda a resolver um problema comum em SEO: a **canibalização de palavras-chave** (quando várias páginas do seu site competem entre si no Google pela mesma intenção de busca, dividindo a força do seu domínio).

O fluxo de funcionamento do aplicativo é o seguinte:

1. **Upload da Lista**: Você fornece um arquivo CSV com suas palavras-chave e volumes de busca correspondentes.
2. **Coleta de SERP (Google)**: Para cada palavra, o app faz uma busca em tempo real no Google (via API Serper.dev ou Google CSE) e extrai os **Top 7 resultados orgânicos (URLs)**.
3. **Cálculo de Similaridade (Overlap)**: O algoritmo compara as URLs obtidas de cada palavra-chave. Se duas palavras compartilham **80% ou mais de similaridade** (pelo menos 6 das 7 URLs iguais), significa que o Google trata ambos os termos com a **mesma intenção de busca**.
4. **Agrupamento Automático**: O app agrupa as palavras com intenções de busca idênticas em um mesmo grupo.
5. **Definição da Palavra Principal**: Em cada grupo, a palavra-chave com o **maior volume de busca** é eleita como a **Principal (Principal)**, e as demais são listadas como **Variações Canibalizadas**.

### Aplicação Prática no SEO:
- **Crie apenas 1 artigo** robusto focado na **Palavra-Chave Principal** do grupo.
- **Evite criar artigos separados** para as variações; em vez disso, use-as como subtítulos (H2/H3) ou variações semânticas dentro do mesmo artigo.
- Isso impede que suas próprias páginas canibalizem o tráfego umas das outras e foca toda a autoridade em um único conteúdo poderoso.

## Instalação

1. Clone o projeto
2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` (opcional):
   - Copie `.env.example` para `.env`
   - Adicione sua chave da RapidAPI se desejar usar a API paga

## Uso

1. Inicie o servidor:
```bash
npm run dev
```

2. Em outro terminal, inicie o compilador do Tailwind CSS:
```bash
npm run tailwind
```

3. Acesse http://localhost:3000 no navegador

4. Faça upload de um arquivo CSV com palavras-chave no formato:
```csv
Palavra-Chave,Volume
exemplo palavra 1,1000
exemplo palavra 2,500
```

5. Selecione a API desejada (Google gratuita ou RapidAPI paga)

6. Clique em "Analisar" e aguarde o processamento

7. Visualize os grupos de palavras canibalizadas

8. Exporte os resultados para CSV

## Estrutura do Projeto

```
SiloOrganizer/
├── api/
│   ├── searchClient.js      # Cliente para APIs de busca
│   └── groupingLogic.js     # Lógica de agrupamento
├── public/
│   ├── index.html           # Interface HTML
│   ├── script.js            # Lógica do frontend
│   ├── input.css            # CSS fonte do Tailwind
│   └── style.css            # CSS compilado
├── uploads/                 # Arquivos temporários
├── server.js                # Servidor Express
├── package.json             # Dependências
└── .env                     # Variáveis de ambiente
```

## Scripts Disponíveis

- `npm start`: Inicia o servidor em produção
- `npm run dev`: Inicia o servidor em desenvolvimento (com nodemon)
- `npm run tailwind`: Compila CSS do Tailwind em modo watch

## Funcionalidades

- Upload de arquivo CSV com palavras-chave
- Análise de canibalização baseada em SERP
- Agrupamento automático (80% de similaridade)
- Destaque da palavra principal de cada grupo
- Exportação dos resultados para CSV
- Suporte a APIs gratuitas e pagas

## Tecnologias Utilizadas

- Node.js + Express
- HTML + Tailwind CSS
- JavaScript Vanilla
- CSV Parser
- Axios para requisições HTTP