const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { fetchSerpResults } = require('./api/searchClient');
const { groupSimilarKeywords } = require('./api/groupingLogic');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/agrupar', upload.single('keywordFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
  }

  const socketId = req.body.socketId; // Receber socketId do cliente
  const apiProvider = req.body.apiProvider || 'serper';

  // Receber credenciais do frontend
  const frontendCredentials = {
    googleApiKey: req.body.googleApiKey,
    googleCseId: req.body.googleCseId,
    serperApiKey: req.body.serperApiKey
  };

  const results = [];

  // Detectar delimitador lendo a primeira linha
  let separator = ',';
  try {
    const fileHeader = fs.readFileSync(req.file.path, 'utf8').split('\n')[0];
    if (fileHeader.includes(';')) {
      separator = ';';
    }
  } catch (err) {
    console.error('Erro ao ler arquivo para detectar separador:', err.message);
  }

  fs.createReadStream(req.file.path)
    .pipe(csv({ separator: separator }))
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      fs.unlinkSync(req.file.path);

      // Filtrar resultados válidos (remover vazios ou 'undefined')
      const validResults = results.filter(item => {
        const key = item['Palavra-Chave'] || item.keyword || item.Keyword || Object.values(item)[0];
        return key && typeof key === 'string' && key.trim() !== '' && key.trim().toLowerCase() !== 'undefined';
      });

      try {
        console.log(`\n🚀 Iniciando processamento de ${validResults.length} palavras-chave com provedor: ${apiProvider}`);
        console.log('━'.repeat(50));

        // Calcular tempo estimado (1s por requisição para Google, ou sem delay para Serper se configurado)
        const isGoogle = apiProvider === 'google';
        const estimatedTime = isGoogle ? Math.ceil(validResults.length / 60) : Math.ceil(validResults.length / 300);

        // Enviar atualização inicial
        if (socketId) {
          io.to(socketId).emit('progress', {
            message: `Iniciando análise de ${validResults.length} palavras-chave... (Tempo estimado: ~${estimatedTime} minuto${estimatedTime > 1 ? 's' : ''})`,
            progress: 0,
            total: validResults.length,
            current: 0
          });
        }

        // Processar sequencialmente para evitar rate limiting
        const keywordsWithSerps = [];

        for (let i = 0; i < validResults.length; i++) {
          const keyword = validResults[i];
          const keywordText = (keyword['Palavra-Chave'] || keyword.keyword || keyword.Keyword || Object.values(keyword)[0]).trim();
          const volume = keyword['Volume'] || keyword.volume || keyword.Volume || '0';

          // Enviar atualização antes de buscar
          if (socketId) {
            io.to(socketId).emit('progress', {
              message: `[${i + 1}/${validResults.length}] Analisando com ${apiProvider}: "${keywordText}"`,
              progress: Math.round((i / validResults.length) * 100),
              total: validResults.length,
              current: i + 1
            });
          }

          const serps = await fetchSerpResults(keywordText, apiProvider, i + 1, validResults.length, frontendCredentials);

          keywordsWithSerps.push({
            keyword: keywordText,
            volume: volume,
            serps: serps
          });

          // Mostrar progresso
          const progress = Math.round(((i + 1) / validResults.length) * 100);
          console.log(`📊 Progresso: ${progress}% (${i + 1}/${validResults.length})`);

          // Enviar atualização após buscar
          if (socketId) {
            io.to(socketId).emit('progress', {
              message: `✓ Concluído: "${keywordText}"`,
              progress: progress,
              total: validResults.length,
              current: i + 1
            });
          }
        }

        console.log('━'.repeat(50));
        console.log('✅ Processamento concluído!');

        // Enviar atualização de agrupamento
        if (socketId) {
          io.to(socketId).emit('progress', {
            message: 'Agrupando palavras-chave similares...',
            progress: 100
          });
        }

        const groups = groupSimilarKeywords(keywordsWithSerps);

        const formattedGroups = groups.map((group, index) => ({
          groupId: index + 1,
          keywords: group.map(item => ({
            'Palavra-Chave': item.keyword,
            'Volume': item.volume,
            'SERPs': item.serps || [],
            'Similaridade': item.similarity || 100
          }))
        }));

        res.json({
          message: 'Arquivo processado com sucesso!',
          keywordCount: validResults.length,
          groups: formattedGroups,
          keywords: formattedGroups.flatMap(g => g.keywords)
        });
      } catch (error) {
        console.error('Erro ao processar palavras-chave:', error);
        res.status(500).json({ error: 'Erro ao processar as palavras-chave' });
      }
    })
    .on('error', (err) => {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Erro ao processar o arquivo CSV' });
    });
});

app.post('/api/exportar', (req, res) => {
  const { groups } = req.body;

  if (!groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: 'Dados inválidos para exportação' });
  }

  let csvContent = 'Keyword Principal,Variações Canibalizadas\n';

  groups.forEach(group => {
    const keywords = group.keywords || [];
    if (keywords.length > 0) {
      const principal = keywords[0]['Palavra-Chave'] || '';
      const variacoes = keywords.slice(1).map(k => k['Palavra-Chave']).join(',');

      const principalEscaped = principal.includes(',') ? `"${principal}"` : principal;
      const variacoesEscaped = variacoes.includes(',') ? `"${variacoes}"` : variacoes;

      csvContent += `${principalEscaped},${variacoesEscaped}\n`;
    }
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="keywords_agrupadas.csv"');
  res.status(200).send('\ufeff' + csvContent);
});

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
