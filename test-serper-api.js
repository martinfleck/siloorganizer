const axios = require('axios');
require('dotenv').config();

function simulateGoogleResults(keyword) {
    const baseUrls = [
        'https://www.exemplo1.com.br/',
        'https://www.exemplo2.com.br/',
        'https://www.site1.com.br/',
        'https://www.portal1.com.br/',
        'https://www.blog1.com.br/',
        'https://www.loja1.com.br/',
        'https://www.info1.com.br/'
    ];
    
    const keywords = keyword.toLowerCase().split(' ');
    const variant = keywords.join('-');
    
    return baseUrls.map((url, index) => {
        if (index < 3) {
            return url + variant;
        }
        return url + keywords[0];
    });
}

async function testSerperSearch(keyword, apiKey) {
    if (!apiKey || apiKey === 'SUA_CHAVE_SERPER_AQUI') {
        console.warn('⚠️ SERPER_API_KEY não configurada ou padrão. Usando resultados simulados.');
        return simulateGoogleResults(keyword);
    }
    
    console.log(`Buscando no Serper.dev para: "${keyword}"...`);
    
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: keyword,
            gl: 'br',
            hl: 'pt-br',
            num: 7
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        const items = response.data.organic || [];
        const urls = items.map(item => item.link).filter(url => url);
        
        console.log(`✓ Conexão bem-sucedida! Encontrados ${urls.length} resultados.`);
        urls.slice(0, 7).forEach((url, index) => {
            console.log(`${index + 1}. ${url}`);
        });
        
        return urls.slice(0, 7);
    } catch (error) {
        console.error(`❌ Erro ao buscar no Serper.dev: ${error.message}`);
        if (error.response) {
            console.error('Detalhes do erro:', error.response.data);
        }
        return [];
    }
}

const apiKey = process.env.SERPER_API_KEY;
testSerperSearch('melhor whey protein', apiKey);
