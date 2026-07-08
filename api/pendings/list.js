// api/pendings/list.js
module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Tenta carregar mongoose apenas se MONGODB_URI existir
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            console.log('MONGODB_URI não configurada');
            return res.status(200).json({ success: true, pendings: [] });
        }

        // Carrega mongoose dinamicamente
        const mongoose = require('mongoose');
        
        // Conecta se necessário
        if (mongoose.connection.readyState !== 1) {
            try {
                await mongoose.connect(uri);
                console.log('Conectado ao MongoDB');
            } catch (err) {
                console.error('Erro ao conectar:', err.message);
                return res.status(200).json({ success: true, pendings: [] });
            }
        }

        // Schema
        const PendingSchema = new mongoose.Schema({
            type: String,
            data: Object,
            done: Boolean,
            createdAt: Date
        }, { strict: false });

        // Usa modelo existente ou cria novo
        const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

        // Busca pendências
        const pendings = await Pending.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
            .catch(err => {
                console.error('Erro na query:', err.message);
                return [];
            });

        console.log('Pendências encontradas:', pendings.length);

        // Formata
        const formatted = pendings.map(p => ({
            id: p._id ? p._id.toString() : '0',
            command: p.type || (p.data && p.data.command) || 'comando',
            params: (p.data && p.data.params) || '',
            result: (p.data && p.data.result) || '',
            done: p.done === true || p.done === 'true',
            createdAt: p.createdAt || new Date()
        }));

        return res.status(200).json({ success: true, pendings: formatted });

    } catch (error) {
        console.error('Erro geral:', error.message);
        // SEMPRE retorna 200 com array vazio
        return res.status(200).json({ 
            success: true, 
            pendings: [],
            error: error.message 
        });
    }
};
