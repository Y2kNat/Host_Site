const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI;
let cached = global.mongoose || { conn: null };

async function connect() {
    if (cached.conn) return cached.conn;
    cached.conn = await mongoose.connect(MONGO_URI);
    return cached.conn;
}

const CredentialSchema = new mongoose.Schema({
    user: String, password: String, role: String, guildId: String,
    active: Boolean, lastLogin: Date, createdBy: String, createdAt: Date
});
const Credential = mongoose.models.Credential || mongoose.model('Credential', CredentialSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'hostville-secret-key-2024';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    await connect();

    try {
        // POST /api/auth - LOGIN
        if (req.method === 'POST') {
            const { username, password } = req.body || {};
            if (!username || !password) return res.json({ error: 'Usuário e senha obrigatórios' });

            const cred = await Credential.findOne({ user: username, password, active: true });
            if (!cred) return res.json({ error: 'Usuário ou senha inválidos' });

            cred.lastLogin = new Date();
            await cred.save();

            const token = jwt.sign(
                { id: cred._id, user: cred.user, role: cred.role, guildId: cred.guildId },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({ token, user: { name: cred.user, role: cred.role } });
        }

        res.status(404).json({ error: 'Rota não encontrada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
