export function captureUTM() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Gera sessionId se não existir
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('sessionId', sessionId);
    }

    const utmData = {
        source: urlParams.get('utm_source') || 'direto',
        medium: urlParams.get('utm_medium') || '',
        campaign: urlParams.get('utm_campaign') || '',
        fbclid: urlParams.get('fbclid') || '',
        gclid: urlParams.get('gclid') || '',
        bairroQR: urlParams.get('bairro') || '',
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        pagina: window.location.pathname,
        dispositivo: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        referrer: document.referrer || 'direto'
    };

    // Salva as UTMs da sessão atual (não sobrescreve se já houver uma sessão válida na mesma visita, mas para este projeto, a cada entrada, se tiver param novo, atualizamos)
    const storedUtm = JSON.parse(localStorage.getItem('utmData') || '{}');
    const mergedUtm = { ...storedUtm, ...utmData };
    
    // Removemos chaves vazias se antes não tinha nada ou sobrescreve com nova origem
    if (urlParams.get('utm_source') || !storedUtm.source) {
        localStorage.setItem('utmData', JSON.stringify(utmData));
        return utmData;
    }

    return storedUtm;
}

export function getUTM() {
    return JSON.parse(localStorage.getItem('utmData') || '{}');
}
