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
    type: String, data: Object, done: Boolean, result: String, createdAt: Date
}));

const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Não autorizado' });
        jwt.verify(token, JWT_SECRET);

        await connect();
        const { pendingId } = req.query || {};
        if (!pendingId) return res.json({ error: 'ID não informado' });

        const pending = await Pending.findById(pendingId).lean();
        if (!pending) return res.json({ done: false, result: 'Pendência não encontrada' });

        res.json({ done: pending.done || false, result: pending.result || 'Executando...' });
    } catch (e) {
        res.json({ error: e.message });
    }
};