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

        const { channelId, motivo, closedBy } = req.body || {};

        if (!channelId) {
            return res.status(200).json({ success: false, error: 'channelId é obrigatório' });
        }

        const db = mongoose.connection.db;
        const collection = db.collection('pendings');

        const pending = await collection.findOne({
            $or: [
                { 'data.channelId': channelId },
                { channelId: channelId }
            ],
            done: { $ne: true }
        });

        if (!pending) {
            return res.status(200).json({
                success: false,
                error: 'Nenhum ticket aberto encontrado neste canal'
            });
        }

        await collection.deleteOne({ _id: pending._id });

        console.log('Ticket deletado:', pending._id.toString());

        return res.status(200).json({
            success: true,
            message: 'Ticket fechado e removido',
            deletedId: pending._id.toString()
        });

    } catch (error) {
        console.error('Erro:', error.message);
        return res.status(200).json({ success: false, error: error.message });
    }
};
