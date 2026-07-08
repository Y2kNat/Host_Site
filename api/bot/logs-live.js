// api/bot/logs-live.js
// Esta API mantém a conexão aberta e envia logs em tempo real via SSE

// Armazena os clientes conectados (em memória - funciona na Vercel)
// Nota: como Vercel é serverless, isso só funciona enquanto a função estiver "quente"

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Envia um ping inicial
    res.write('event: connected\ndata: {"status":"connected"}\n\n');

    // Mantém a conexão viva com ping a cada 15 segundos
    var pingInterval = setInterval(function() {
        res.write('event: ping\ndata: {"ping":' + Date.now() + '}\n\n');
    }, 15000);

    // Quando o cliente desconectar, limpa o intervalo
    req.on('close', function() {
        clearInterval(pingInterval);
        res.end();
    });
};
