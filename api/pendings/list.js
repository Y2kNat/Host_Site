// api/pendings/list.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) return res.status(200).json({ success: true, pendings: [] });

        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) await mongoose.connect(uri);

        const db = mongoose.connection.db;
        
        // 1. Tenta a coleção 'pendings' primeiro
        const pendingsCol = db.collection('pendings');
        let docs = await pendingsCol.find({}).sort({ createdAt: -1 }).limit(100).toArray();
        
        console.log('Coleção pendings:', docs.length, 'documentos');
        
        // 2. Se vazio, mostra 1 documento de exemplo para ver a estrutura
        if (docs.length === 0) {
            // Verifica se a coleção existe mas está vazia
            const count = await pendingsCol.countDocuments({});
            console.log('Contagem na coleção pendings:', count);
            
            // Tenta buscar sem limite pra ver se tem algum
            docs = await pendingsCol.find({}).limit(100).toArray();
        }

        // Formata os documentos encontrados
        const formatted = docs.map(doc => ({
            id: doc._id ? doc._id.toString() : '0',
            command: doc.type || doc.command || (doc.data && doc.data.command) || 'comando',
            params: (doc.data && doc.data.params) || doc.params || '',
            result: (doc.data && doc.data.result) || doc.result || '',
            done: doc.done === true || doc.done === 'true' || doc.status === 'done',
            createdAt: doc.createdAt || doc.created_at || new Date()
        }));

        return res.status(200).json({
            success: true,
            pendings: formatted,
            debug: {
                colecao: 'pendings',
                totalDocumentos: docs.length,
                exemplos: docs.slice(0, 2).map(d => JSON.stringify(d).substring(0, 400))
            }
        });

    } catch (error) {
        console.error('Erro:', error.message);
        return res.status(200).json({ 
            success: true, 
            pendings: [],
            debug: { erro: error.message }
        });
    }
};
