// api/pendings/list.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Schema igual ao que já existe
const PendingSchema = new mongoose.Schema({
    type: String,
    data: Object,
    done: Boolean,
    createdAt: Date
});

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Conectar ao MongoDB
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI);
        }
        
        // Usar o modelo que já existe OU criar
        const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

        const pendings = await Pending.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const formatted = pendings.map(p => ({
            id: p._id.toString(),
            command: p.type || (p.data && p.data.command) || 'comando',
            params: (p.data && p.data.params) || '',
            result: (p.data && p.data.result) || '',
            done: p.done || false,
            createdAt: p.createdAt || new Date()
        }));

        res.status(200).json({ success: true, pendings: formatted });
        
    } catch (error) {
        console.error('Erro ao buscar pendências:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            pendings: [] 
        });
    }
};
