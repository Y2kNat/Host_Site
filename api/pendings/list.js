// api/pending/list.js
// Busca as pendências do MongoDB e retorna como JSON

const mongoose = require('mongoose');

// Conectar ao MongoDB (ajuste a string de conexão conforme seu .env)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostville';

// Modelo Pending (mesmo que já existe no seu projeto)
const PendingSchema = new mongoose.Schema({
    type: String,
    data: Object,
    done: Boolean,
    createdAt: Date
});

const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

export default async function handler(req, res) {
    // Verificar autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        // Conectar ao MongoDB se não estiver conectado
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI);
        }

        // Buscar TODAS as pendências (ativas e concluídas)
        const pendings = await Pending.find({})
            .sort({ createdAt: -1 }) // Mais recentes primeiro
            .limit(100) // Limite de 100 registros
            .lean(); // Retorna objetos JavaScript puros

        // Formatar os dados para o frontend
        const formattedPendings = pendings.map(p => ({
            id: p._id.toString(),
            command: p.type || (p.data && p.data.command) || 'comando',
            params: (p.data && p.data.params) || '',
            result: (p.data && p.data.result) || '',
            status: p.done ? 'done' : 'pending',
            done: p.done || false,
            createdAt: p.createdAt || new Date(),
            data: p.data || {}
        }));

        // Retornar como JSON
        res.status(200).json({
            success: true,
            pendings: formattedPendings,
            total: formattedPendings.length
        });

    } catch (error) {
        console.error('Erro ao buscar pendências:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao buscar pendências do banco de dados',
            message: error.message 
        });
    }
}
