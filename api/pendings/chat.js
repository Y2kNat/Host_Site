const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.json({ error: 'Não autorizado' });
        const user = jwt.verify(token, JWT_SECRET);
        const { message } = req.body || {};

        if (!message) return res.json({ response: 'Digite algo.' });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: `Você é o HostBot. Usuário nível ${user.role} falou com você. Responda de forma útil e amigável.` },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        const response = completion.choices[0]?.message?.content?.trim() || 'Sem resposta.';
        res.json({ response });
    } catch (e) {
        res.json({ error: e.message });
    }
};
