const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

// Comandos permitidos por nível de acesso
const ALLOWED_COMMANDS = {
    full: ['ping', 'uptime', 'stats', 'servidor', 'bot', 'say', 'anuncio', 'modo', 'voicemode', 'mencionar', 'autointervalo', 'automsg'],
    owner: ['ping', 'uptime', 'stats', 'say', 'anuncio', 'autointervalo', 'automsg'],
    admin: ['ping', 'say', 'automsg'],
    tester: ['ping', 'uptime', 'bot']
};

// Sistema de prompt RÍGIDO - APENAS responde aos comandos permitidos
const SYSTEM_PROMPTS = {
    full: `VOCÊ É O HOSTBOT - MODO RESTRITO. REGRAS ABSOLUTAS:
1. VOCÊ DEVE RESPONDER APENAS AOS SEGUINTES COMANDOS: /ping, /uptime, /stats, /servidor, /bot, /say [mensagem], /anuncio [mensagem], /modo [normal/savage/hacker/respeitoso/boiola], /voicemode [on/off], /mencionar [@usuario], /autointervalo [tempo], /automsg [on/off]
2. QUALQUER OUTRA MENSAGEM DEVE SER RESPONDIDA COM: "⚠️ Comando não reconhecido. Use /comandos para ver a lista de comandos disponíveis."
3. NUNCA responda perguntas gerais, conversas casuais ou qualquer coisa fora dos comandos listados.
4. Se o usuário digitar /comandos, liste APENAS os comandos permitidos.
5. MANTENHA-SE ESTRITAMENTE NOS COMANDOS. NADA DE CONVERSAS.`,

    owner: `VOCÊ É O HOSTBOT - MODO RESTRITO. REGRAS ABSOLUTAS:
1. VOCÊ DEVE RESPONDER APENAS AOS SEGUINTES COMANDOS: /ping, /uptime, /stats, /say [mensagem], /anuncio [mensagem], /autointervalo [tempo], /automsg [on/off]
2. QUALQUER OUTRA MENSAGEM DEVE SER RESPONDIDA COM: "⚠️ Comando não reconhecido. Use /comandos para ver a lista de comandos disponíveis."
3. NUNCA responda perguntas gerais, conversas casuais ou qualquer coisa fora dos comandos listados.
4. Se o usuário digitar /comandos, liste APENAS os comandos permitidos.
5. MANTENHA-SE ESTRITAMENTE NOS COMANDOS. NADA DE CONVERSAS.`,

    admin: `VOCÊ É O HOSTBOT - MODO RESTRITO. REGRAS ABSOLUTAS:
1. VOCÊ DEVE RESPONDER APENAS AOS SEGUINTES COMANDOS: /ping, /say [mensagem], /automsg [on/off]
2. QUALQUER OUTRA MENSAGEM DEVE SER RESPONDIDA COM: "⚠️ Comando não reconhecido. Use /comandos para ver a lista de comandos disponíveis."
3. NUNCA responda perguntas gerais, conversas casuais ou qualquer coisa fora dos comandos listados.
4. Se o usuário digitar /comandos, liste APENAS os comandos permitidos.
5. MANTENHA-SE ESTRITAMENTE NOS COMANDOS. NADA DE CONVERSAS.`,

    tester: `VOCÊ É O HOSTBOT - MODO RESTRITO. REGRAS ABSOLUTAS:
1. VOCÊ DEVE RESPONDER APENAS AOS SEGUINTES COMANDOS: /ping, /uptime, /bot
2. QUALQUER OUTRA MENSAGEM DEVE SER RESPONDIDA COM: "⚠️ Comando não reconhecido. Use /comandos para ver a lista de comandos disponíveis."
3. NUNCA responda perguntas gerais, conversas casuais ou qualquer coisa fora dos comandos listados.
4. Se o usuário digitar /comandos, liste APENAS os comandos permitidos.
5. MANTENHA-SE ESTRITAMENTE NOS COMANDOS. NADA DE CONVERSAS.`
};

function isValidCommand(message, allowedCommands) {
    const commandMatch = message.match(/^\/(\w+)/);
    if (!commandMatch) return false;
    
    const command = commandMatch[1].toLowerCase();
    
    // Comando especial /comandos sempre permitido
    if (command === 'comandos') return true;
    
    return allowedCommands.includes(command);
}

function getCommandsList(allowedCommands) {
    const commandsMap = {
        'ping': 'Verificar latência do bot',
        'uptime': 'Tempo de atividade do bot',
        'stats': 'Estatísticas do servidor',
        'servidor': 'Informações do servidor',
        'bot': 'Status do bot',
        'say': 'Enviar mensagem no chat',
        'anuncio': 'Fazer anúncio no servidor',
        'modo': 'Alterar modo do bot (normal/savage/hacker/respeitoso/boiola)',
        'voicemode': 'Ativar/desativar modo de voz',
        'mencionar': 'Mencionar um usuário',
        'autointervalo': 'Definir intervalo de mensagens automáticas',
        'automsg': 'Ativar/desativar mensagens automáticas'
    };
    
    return allowedCommands.map(cmd => `/${cmd} - ${commandsMap[cmd] || 'Comando disponível'}`).join('\n');
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Não autorizado' });
        
        const user = jwt.verify(token, JWT_SECRET);
        const { message } = req.body || {};

        if (!message) return res.json({ response: '⚠️ Digite um comando. Use /comandos para ver os disponíveis.' });

        const userRole = user.role || 'tester';
        const allowedCommands = ALLOWED_COMMANDS[userRole] || [];

        // Verificação RÍGIDA de comandos
        if (!message.startsWith('/')) {
            return res.json({ 
                response: '⚠️ Apenas comandos são aceitos. Use /comandos para ver a lista de comandos disponíveis.' 
            });
        }

        // Comando especial /comandos
        if (message.toLowerCase().startsWith('/comandos')) {
            const commandsList = getCommandsList(allowedCommands);
            return res.json({ 
                response: `📋 Comandos disponíveis para seu nível (${userRole}):\n\n${commandsList}\n\nDigite o comando para executar.` 
            });
        }

        // Validação RÍGIDA do comando
        if (!isValidCommand(message, allowedCommands)) {
            return res.json({ 
                response: '⚠️ Comando não reconhecido ou não autorizado para seu nível. Use /comandos para ver os disponíveis.' 
            });
        }

        // Processamento APENAS para comandos válidos
        const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages: [
                { 
                    role: 'system', 
                    content: SYSTEM_PROMPTS[userRole] || SYSTEM_PROMPTS.tester
                },
                { 
                    role: 'user', 
                    content: `COMANDO RECEBIDO: ${message}\n\nEXECUTE APENAS ESTE COMANDO. NÃO RESPONDA NADA FORA DO ESCOPO DO COMANDO.` 
                }
            ],
            temperature: 0.3, // Temperatura baixa para respostas mais previsíveis
            max_tokens: 200,
            top_p: 0.9
        });

        const response = completion.choices[0]?.message?.content?.trim() || '⚠️ Erro ao processar comando.';
        
        // Verificação final - se a resposta contiver algo não relacionado a comandos
        if (!response.includes('/') && !response.includes('comando') && !response.includes('✅')) {
            return res.json({ 
                response: '⚠️ Resposta inválida. Por favor, use apenas os comandos disponíveis com /comandos' 
            });
        }

        res.json({ response });
        
    } catch (e) {
        console.error('Erro no chat:', e);
        res.status(500).json({ 
            response: '⚠️ Erro interno. Tente novamente com um comando válido. Use /comandos.' 
        });
    }
};
