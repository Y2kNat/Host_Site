const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI;
let cached = global.mongoose || { conn: null };

async function connect() {
    if (cached.conn) return cached.conn;
    cached.conn = await mongoose.connect(MONGO_URI);
    return cached.conn;
}

const Memory = mongoose.models.Memory || mongoose.model('Memory', new mongoose.Schema({
    user: String, question: String, answer: String, understood: Boolean, category: String, guildId: String, timestamp: Date
}));

const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Não autorizado' });
        const user = jwt.verify(token, JWT_SECRET);
        if (user.role !== 'full') return res.status(403).json({ error: 'Apenas FULL' });

        await connect();

        await Memory.updateMany({ category: 'ticket' }, { understood: true });
        await Memory.deleteMany({ category: 'ticket' });

        res.json({ ok: true, message: 'Tickets resetados!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
