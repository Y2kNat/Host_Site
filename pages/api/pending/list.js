// pages/api/pending/list.js

import mongoose from 'mongoose';

// Modelo Pending - mesmo que já existe no seu projeto
const PendingSchema = new mongoose.Schema({
    type: String,
    data: Object,
    done: Boolean,
    createdAt: Date
});

const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

// Conectar ao MongoDB
async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostville';
    await mongoose.connect(MONGODB_URI);
}

export default async function handler(req, res) {
    // Permitir apenas GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        await connectDB();

        // Buscar todas as pendências
        const pendings = await Pending.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const formatted = pendings.map(p => ({
            id: p._id.toString(),
            command: p.type || p.data?.command || 'comando',
            params: p.data?.params || '',
            result: p.data?.result || '',
            status: p.done ? 'done' : 'pending',
            done: p.done || false,
            createdAt: p.createdAt || new Date()
        }));

        res.status(200).json({
            success: true,
            pendings: formatted,
            total: formatted.length
        });

    } catch (error) {
        console.error('Erro ao listar pendências:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno',
            pendings: [] 
        });
    }
}
