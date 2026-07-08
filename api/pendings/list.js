const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI;

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI).then(function(m) {
            return m;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

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
        await connectDB();

        var Pending = mongoose.models.Pending || mongoose.model('Pending', new mongoose.Schema({
            type: String,
            data: Object,
            done: Boolean,
            createdAt: Date
        }));

        var pendings = await Pending.find({}).sort({ createdAt: -1 }).limit(100).lean();

        var formatted = pendings.map(function(p) {
            var command = 'comando';
            if (p.type && p.type !== 'comando') {
                command = p.type;
            } else if (p.data && p.data.command) {
                command = p.data.command;
            } else if (p.command) {
                command = p.command;
            }

            return {
                id: p._id ? p._id.toString() : '0',
                command: command,
                params: (p.data && p.data.params) || p.params || '',
                result: (p.data && p.data.result) || p.result || '',
                done: p.done === true || p.done === 'true',
                createdAt: p.createdAt || new Date()
            };
        });

        res.status(200).json({
            success: true,
            pendings: formatted
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            pendings: []
        });
    }
};            } else if (doc.params) {
                params = doc.params;
            }

            // Extrair resultado
            var result = '';
            if (doc.data && doc.data.result) {
                result = doc.data.result;
            } else if (doc.result) {
                result = doc.result;
            }

            // Verificar se está concluído
            var done = false;
            if (doc.done === true || doc.done === 'true') {
                done = true;
            } else if (doc.status === 'done' || doc.status === 'completed') {
                done = true;
            }

            // Obter data de criação
            var createdAt = doc.createdAt || doc.created_at || new Date();

            return {
                id: doc._id ? doc._id.toString() : '0',
                command: command,
                params: params,
                result: result,
                done: done,
                createdAt: createdAt
            };
        });

        console.log('Pendências formatadas:', formattedPendings.length);

        // Retornar resposta de sucesso
        return res.status(200).json({
            success: true,
            pendings: formattedPendings,
            total: formattedPendings.length,
            debug: {
                totalNaColecao: totalDocuments,
                documentosBuscados: documents.length,
                pendingsFormatadas: formattedPendings.length,
                primeiroDocumento: documents.length > 0 ? JSON.stringify(documents[0]).substring(0, 500) : 'VAZIO'
            }
        });

    } catch (error) {
        // Logar o erro no console
        console.error('Erro ao buscar pendências do MongoDB:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);

        // Sempre retornar 200 com array vazio para não quebrar o frontend
        return res.status(200).json({
            success: true,
            pendings: [],
            total: 0,
            debug: {
                error: error.message,
                stack: error.stack ? error.stack.substring(0, 500) : 'Sem stack trace'
            }
        });
    }
};
