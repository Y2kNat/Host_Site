const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MONGO_URI = process.env.MONGO_URI;
let cached = global.mongoose || { conn: null };

async function connect() {
    if (cached.conn) return cached.conn;
    cached.conn = await mongoose.connect(MONGO_URI);
    return cached.conn;
}

const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.json({ error: 'Não autorizado' });
        const user = jwt.verify(token, JWT_SECRET);
        const { message, role } = req.body || {};

        const systemPrompt = `Você é o HostBot. Usuário nível ${role} enviou: "${message}".
Se for um comando (ex: /warn @user motivo), execute e retorne o resultado.
Se for conversa normal, responda normalmente.
Comandos disponíveis para ${role}: os padrões do Discord.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            temperature: 0.5, max_tokens: 300
        });

        res.json({ response: completion.choices[0]?.message?.content || 'Sem resposta' });
    } catch (e) {
        res.json({ error: e.message });
    }
};
