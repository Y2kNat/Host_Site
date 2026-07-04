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
        if (req.method === 'POST' && !req.body?.action) {
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

        // POST /api/auth - CRIAR CREDENCIAL (action=credentials)
        if (req.method === 'POST' && req.body?.action === 'credentials') {
            const token = req.headers['authorization']?.replace('Bearer ', '');
            if (!token) return res.status(401).json({ error: 'Não autorizado' });

            let decoded;
            try { decoded = jwt.verify(token, JWT_SECRET); }
            catch (e) { return res.status(401).json({ error: 'Token inválido' }); }

            if (decoded.role !== 'full') return res.status(403).json({ error: 'Apenas FULL pode criar credenciais' });

            const { user, password, role, guildId } = req.body;
            if (!['full', 'owner', 'admin', 'tester'].includes(role)) return res.json({ error: 'Role inválida' });

            const exists = await Credential.findOne({ user });
            if (exists) {
                exists.password = password;
                exists.role = role;
                exists.guildId = guildId || null;
                await exists.save();
            } else {
                await Credential.create({
                    user, password, role,
                    guildId: guildId || null,
                    active: true,
                    createdBy: decoded.user
                });
            }

            return res.json({ ok: true });
        }

        // GET /api/auth - LISTAR CREDENCIAIS
        if (req.method === 'GET') {
            const token = req.headers['authorization']?.replace('Bearer ', '');
            if (!token) return res.status(401).json({ error: 'Não autorizado' });

            let decoded;
            try { decoded = jwt.verify(token, JWT_SECRET); }
            catch (e) { return res.status(401).json({ error: 'Token inválido' }); }

            if (decoded.role !== 'full') return res.status(403).json({ error: 'Apenas FULL' });

            const credentials = await Credential.find({ active: true })
                .select('-password')
                .sort({ createdAt: -1 })
                .lean();

            return res.json(credentials);
        }

        res.status(404).json({ error: 'Rota não encontrada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
