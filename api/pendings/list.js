// api/pendings/list.js
const mongoose = require('mongoose');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) return res.status(200).json({ success: true, pendings: [] });

        if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);

        const Pending = mongoose.models.Pending || mongoose.model('Pending', new mongoose.Schema({
            type: String, data: Object, done: Boolean, createdAt: Date
        }));

        const pendings = await Pending.find({}).sort({ createdAt: -1 }).limit(100).lean();

        res.status(200).json({
            success: true,
            pendings: pendings.map(p => ({
                command: p.type || p.data?.command || 'comando',
                params: p.data?.params || '',
                result: p.data?.result || '',
                done: p.done || false,
                createdAt: p.createdAt || new Date()
            }))
        });
    } catch (e) {
        res.status(200).json({ success: true, pendings: [] });
    }
};// api/pendings/list.js
const mongoose = require('mongoose');

// Schema igual ao que já existe no projeto
const PendingSchema = new mongoose.Schema({
    type: String,
    data: Object,
    done: Boolean,
    createdAt: Date
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Usa a MESMA conexão que já funciona nas outras APIs
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            // Retorna array vazio em vez de erro
            return res.status(200).json({ 
                success: true, 
                pendings: [],
                message: 'MONGODB_URI não configurada'
            });
        }

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(uri);
        }

        // Usa o modelo que já existe OU cria
        const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

        const pendings = await Pending.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const formatted = pendings.map(p => ({
            id: p._id ? p._id.toString() : '0',
            command: p.type || (p.data && p.data.command) || 'comando',
            params: (p.data && p.data.params) || '',
            result: (p.data && p.data.result) || '',
            done: p.done || false,
            createdAt: p.createdAt || new Date()
        }));

        res.status(200).json({ 
            success: true, 
            pendings: formatted 
        });

    } catch (error) {
        // Sempre retorna 200 com array vazio para não quebrar o frontend
        console.error('Erro:', error.message);
        res.status(200).json({ 
            success: true, 
            pendings: [],
            error: error.message
        });
    }
};
