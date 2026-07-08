// api/pendings/list.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await connectDB();
        
        const Pending = mongoose.models.Pending || mongoose.model('Pending', new mongoose.Schema({
            type: String,
            data: Object,
            done: Boolean,
            createdAt: Date
        }));

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
        console.error('Erro:', error);
        res.status(500).json({ success: false, error: 'Erro interno', pendings: [] });
    }
};
