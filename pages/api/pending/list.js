import mongoose from 'mongoose';

const PendingSchema = new mongoose.Schema({
    type: String,
    data: Object,
    done: Boolean,
    createdAt: Date
});

const Pending = mongoose.models.Pending || mongoose.model('Pending', PendingSchema);

async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI não configurada');
    await mongoose.connect(uri);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        await connectDB();

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

        res.status(200).json({ success: true, pendings: formatted });
    } catch (error) {
        console.error('Erro:', error);
        res.status(200).json({ success: true, pendings: [] });
    }
}
