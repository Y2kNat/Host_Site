// api/pendings/list.js
const mongoose = require('mongoose');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return res.status(200).json({ 
                success: true, 
                pendings: [],
                debug: { erro: 'MONGODB_URI não configurada' }
            });
        }

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(uri);
        }

        const db = mongoose.connection.db;
        const pendingsCol = db.collection('pendings');
        
        // Conta total de documentos
        const total = await pendingsCol.countDocuments({});
        
        // Busca todos os documentos
        const docs = await pendingsCol.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        // Formata para o frontend
        const formatted = docs.map(doc => ({
            id: doc._id ? doc._id.toString() : '0',
            command: doc.type || (doc.data && doc.data.command) || 'comando',
            params: (doc.data && doc.data.params) || doc.params || '',
            result: (doc.data && doc.data.result) || doc.result || '',
            done: doc.done === true || doc.done === 'true',
            createdAt: doc.createdAt || new Date()
        }));

        return res.status(200).json({
            success: true,
            pendings: formatted,
            debug: {
                totalNaColecao: total,
                documentosBuscados: docs.length,
                pendingsFormatadas: formatted.length,
                primeiroDocumento: docs.length > 0 ? JSON.stringify(docs[0]).substring(0, 500) : 'VAZIO'
            }
        });

    } catch (error) {
        console.error('ERRO:', error.message);
        return res.status(200).json({ 
            success: true, 
            pendings: [],
            debug: { erro: error.message }
        });
    }
};
