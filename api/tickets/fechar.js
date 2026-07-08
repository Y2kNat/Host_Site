const mongoose = require('mongoose');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            return res.status(200).json({ success: false, error: 'MONGO_URI não configurada' });
        }

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(uri);
        }

        const { channelId } = req.body || {};

        if (!channelId) {
            return res.status(200).json({ success: false, error: 'channelId é obrigatório' });
        }

        const db = mongoose.connection.db;
        const collection = db.collection('pendings');

        // Busca a pendência vinculada a este canal
        const pending = await collection.findOne({
            $or: [
                { 'data.channelId': channelId },
                { channelId: channelId }
            ]
        });

        if (!pending) {
            return res.status(200).json({
                success: false,
                error: 'Nenhum ticket encontrado neste canal'
            });
        }

        // Deleta o ticket do banco de dados
        await collection.deleteOne({ _id: pending._id });

        console.log('✅ Ticket deletado do MongoDB:', pending._id.toString(), '| Canal:', channelId);

        return res.status(200).json({
            success: true,
            message: 'Ticket deletado com sucesso',
            deletedId: pending._id.toString()
        });

    } catch (error) {
        console.error('❌ Erro ao deletar ticket:', error.message);
        return res.status(200).json({ success: false, error: error.message });
    }
};