const axios = require('axios');
const { google } = require('googleapis');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSerpResults(keyword, apiProvider = 'serper', index = 0, total = 0, frontendCredentials = {}) {
    try {
        if (apiProvider === 'serper') {
            return await fetchSerperResults(keyword, index, total, frontendCredentials);
        } else {
            // Adiciona delay para respeitar rate limit do Google (100 requisições por 100 segundos)
            if (index > 0) {
                console.log(`⏳ Aguardando 1 segundo antes da próxima requisição (${index}/${total})...`);
                await delay(1000);
            }
            return await fetchGoogleResults(keyword, index, total, frontendCredentials);
        }
    } catch (error) {
        console.error(`Erro ao buscar resultados para "${keyword}":`, error.message);
        return [];
    }
}

async function fetchSerperResults(keyword, index = 0, total = 0, frontendCredentials = {}) {
    // Usar credencial do frontend se fornecida, senão usar do .env
    const apiKey = frontendCredentials.serperApiKey || process.env.SERPER_API_KEY;
    
    if (!apiKey) {
        console.warn('SERPER_API_KEY não configurada, usando resultados simulados');
        return simulateGoogleResults(keyword);
    }
    
    if (index > 0 && total > 0) {
        console.log(`[${index}/${total}] Buscando no Serper.dev: "${keyword}"`);
    } else {
        console.log(`Buscando no Serper.dev: "${keyword}"`);
    }
    
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: keyword,
            gl: 'br',         // País: Brasil
            hl: 'pt-br',      // Idioma: Português Brasil
            num: 7            // Número de resultados (mesmo que Google CSE)
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos de timeout
        });
        
        const items = response.data.organic || [];
        const urls = items.map(item => item.link).filter(url => url);
        
        console.log(`✓ Encontrados ${urls.length} resultados no Serper.dev para "${keyword}"`);
        
        return urls.slice(0, 7);
    } catch (error) {
        console.error(`⚠️ Erro ao buscar no Serper.dev "${keyword}": ${error.message}. Tentando novamente em 1 segundo...`);
        await delay(1000);
        
        try {
            const retryResponse = await axios.post('https://google.serper.dev/search', {
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
            
            const retryItems = retryResponse.data.organic || [];
            const retryUrls = retryItems.map(item => item.link).filter(url => url);
            console.log(`✓ Retry bem-sucedido no Serper.dev! Encontrados ${retryUrls.length} resultados para "${keyword}"`);
            return retryUrls.slice(0, 7);
        } catch (retryError) {
            console.error(`❌ Todas as tentativas na Serper.dev falharam para "${keyword}". Usando resultados simulados.`);
            return simulateGoogleResults(keyword);
        }
    }
}

async function fetchGoogleResults(keyword, index = 0, total = 0, frontendCredentials = {}) {
    // Usar credenciais do frontend se fornecidas, senão usar do .env
    const apiKey = frontendCredentials.googleApiKey || process.env.GOOGLE_API_KEY;
    const cseId = frontendCredentials.googleCseId || process.env.GOOGLE_CSE_ID;
    
    if (!apiKey || !cseId) {
        console.warn('GOOGLE_API_KEY ou GOOGLE_CSE_ID não configuradas, usando resultados simulados');
        return simulateGoogleResults(keyword);
    }
    
    if (index > 0 && total > 0) {
        console.log(`[${index}/${total}] Buscando no Google: "${keyword}"`);
    } else {
        console.log(`Buscando no Google: "${keyword}"`);
    }
    
    try {
        const customsearch = google.customsearch('v1');
        
        const response = await customsearch.cse.list({
            key: apiKey,
            cx: cseId,
            q: keyword,
            num: 7,           // Número de resultados
            gl: 'br',         // País: Brasil
            hl: 'pt-BR',      // Idioma: Português Brasil
            lr: 'lang_pt',    // Restringir a páginas em português
            googlehost: 'google.com.br'  // Host do Google Brasil
        });
        
        const items = response.data.items || [];
        const urls = items.map(item => item.link).filter(url => url);
        
        console.log(`✓ Encontrados ${urls.length} resultados no Google para "${keyword}"`);
        
        return urls.slice(0, 7);
    } catch (error) {
        // Retry automático para qualquer erro
        console.error(`⚠️ Erro ao buscar no Google "${keyword}": ${error.message}. Tentando novamente em 1 segundo...`);
        await delay(1000);
        
        try {
            const customsearch = google.customsearch('v1');
            const retryResponse = await customsearch.cse.list({
                key: apiKey,
                cx: cseId,
                q: keyword,
                num: 7,
                gl: 'br',
                hl: 'pt-BR',
                lr: 'lang_pt',
                googlehost: 'google.com.br'
            });
            
            const retryItems = retryResponse.data.items || [];
            const retryUrls = retryItems.map(item => item.link).filter(url => url);
            console.log(`✓ Retry bem-sucedido! Encontrados ${retryUrls.length} resultados para "${keyword}"`);
            return retryUrls.slice(0, 7);
        } catch (retryError) {
            console.error(`❌ Todas as tentativas falharam para "${keyword}". Usando resultados simulados.`);
            return simulateGoogleResults(keyword);
        }
    }
}

// Função removida - não usamos mais RapidAPI

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

// Função removida - não usamos mais RapidAPI

module.exports = {
    fetchSerpResults
};