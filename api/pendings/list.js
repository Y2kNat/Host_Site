const mongoose = require('mongoose');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed', pendings: [] });
        return;
    }

    try {
        const uri = process.env.MONGO_URI;
        
        if (!uri) {
            console.log('MONGO_URI não configurada');
            return res.status(200).json({ success: true, pendings: [] });
        }

        // Conectar ao MongoDB
        if (mongoose.connection.readyState !== 1) {
            console.log('Conectando ao MongoDB...');
            await mongoose.connect(uri);
            console.log('Conectado!');
        }

        // Acessar diretamente a coleção sem usar modelo
        const db = mongoose.connection.db;
        const collection = db.collection('pendings');
        
        const docs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        console.log('Documentos encontrados:', docs.length);

        const formatted = docs.map(function(doc) {
            var command = 'comando';
            if (doc.type && doc.type !== 'comando') {
                command = doc.type;
            } else if (doc.data && doc.data.command) {
                command = doc.data.command;
            }

            return {
                id: doc._id ? doc._id.toString() : '0',
                command: command,
                params: (doc.data && doc.data.params) || doc.params || '',
                result: (doc.data && doc.data.result) || doc.result || '',
                done: doc.done === true || doc.done === 'true',
                createdAt: doc.createdAt || new Date()
            };
        });

        res.status(200).json({
            success: true,
            pendings: formatted
        });

    } catch (error) {
        console.error('ERRO COMPLETO:', error.message);
        console.error('STACK:', error.stack);
        
        res.status(200).json({
            success: true,
            pendings: [],
            error: error.message
        });
    }
};
