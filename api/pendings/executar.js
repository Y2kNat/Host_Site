const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI;
let cached = global.mongoose || { conn: null };

async function connect() {
    if (cached.conn) return cached.conn;
    cached.conn = await mongoose.connect(MONGO_URI);
    return cached.conn;
}

const Pending = mongoose.models.Pending || mongoose.model('Pending', new mongoose.Schema({
    type: String, data: Object, done: Boolean, createdAt: Date
}));

const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.json({ error: 'Não autorizado' });
        const user = jwt.verify(token, JWT_SECRET);
        const { command, params } = req.body || {};

        await connect();
        await Pending.create({
            type: 'comando',
            data: { command, params, guildId: user.guildId, userId: user.id, role: user.role },
            done: false
        });

        res.json({ message: `✅ Comando /${command} enviado! O bot executará em até 5 segundos.` });
    } catch (e) {
        res.json({ error: e.message });
    }
};
