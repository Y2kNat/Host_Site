// =============================================
// ROTA PARA LISTAR PENDÊNCIAS
// Adicione isso no seu arquivo de rotas do servidor
// =============================================

// Modelo da tabela de pendências (exemplo com MongoDB/Mongoose)
// Se estiver usando outro banco, ajuste a query

// ===== OPCÃO 1: MongoDB com Mongoose =====
const mongoose = require('mongoose');

const PendenciaSchema = new mongoose.Schema({
    command: String,
    params: String,
    result: String,
    status: { type: String, default: 'pending' }, // 'pending', 'done', 'error'
    userId: String,
    userName: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Pendencia = mongoose.model('Pendencia', PendenciaSchema);

// ROTA
app.get('/api/pendings/list', async (req, res) => {
    try {
        // Verificar autenticação
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        // Buscar TODAS as pendências (ativas e concluídas)
        const pendings = await Pendencia.find()
            .sort({ createdAt: -1 }) // Mais recentes primeiro
            .limit(100); // Limite de 100 registros
            
        // Formatar para o frontend
        const formatted = pendings.map(p => ({
            id: p._id,
            command: p.command,
            params: p.params || '',
            result: p.result || '',
            status: p.status,
            done: p.status === 'done',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));
        
        res.json({ pendings: formatted });
    } catch (error) {
        console.error('Erro ao listar pendências:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== OPCÃO 2: PostgreSQL com pg =====
/*
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/pendings/list', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const result = await pool.query(
            'SELECT id, command, params, result, status, created_at, updated_at FROM pendings ORDER BY created_at DESC LIMIT 100'
        );
        
        const pendings = result.rows.map(p => ({
            id: p.id,
            command: p.command,
            params: p.params || '',
            result: p.result || '',
            status: p.status,
            done: p.status === 'done',
            createdAt: p.created_at,
            updatedAt: p.updated_at
        }));
        
        res.json({ pendings });
    } catch (error) {
        console.error('Erro ao listar pendências:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
*/

// ===== OPCÃO 3: SQLite com better-sqlite3 =====
/*
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Criar tabela se não existir
db.exec(`
    CREATE TABLE IF NOT EXISTS pendings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        params TEXT DEFAULT '',
        result TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

app.get('/api/pendings/list', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const pendings = db.prepare(
            'SELECT * FROM pendings ORDER BY created_at DESC LIMIT 100'
        ).all();
        
        const formatted = pendings.map(p => ({
            id: p.id,
            command: p.command,
            params: p.params || '',
            result: p.result || '',
            status: p.status,
            done: p.status === 'done',
            createdAt: p.created_at,
            updatedAt: p.updated_at
        }));
        
        res.json({ pendings: formatted });
    } catch (error) {
        console.error('Erro ao listar pendências:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
*/

// =============================================
// ROTA PARA SALVAR/CRIAR UMA PENDÊNCIA
// =============================================

// MongoDB
app.post('/api/pendings/executar', async (req, res) => {
    try {
        const { command, params } = req.body;
        
        const novaPendencia = new Pendencia({
            command,
            params: params || '',
            status: 'pending'
        });
        
        await novaPendencia.save();
        
        // Executar o comando em background (simulado)
        // Aqui você colocaria a lógica real do seu bot
        setTimeout(async () => {
            try {
                // Simular execução do comando
                const resultado = `Comando /${command} executado com sucesso!`;
                
                await Pendencia.findByIdAndUpdate(novaPendencia._id, {
                    status: 'done',
                    result: resultado,
                    updatedAt: new Date()
                });
            } catch (err) {
                console.error('Erro ao executar comando:', err);
            }
        }, 2000);
        
        res.json({ 
            pendingId: novaPendencia._id,
            message: `Comando /${command} em execução...`
        });
    } catch (error) {
        console.error('Erro ao criar pendência:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// =============================================
// ROTA PARA VERIFICAR RESULTADO
// =============================================
app.get('/api/pendings/resultado', async (req, res) => {
    try {
        const { pendingId } = req.query;
        
        const pendencia = await Pendencia.findById(pendingId);
        
        if (!pendencia) {
            return res.status(404).json({ error: 'Pendência não encontrada' });
        }
        
        res.json({
            done: pendencia.status === 'done',
            result: pendencia.result,
            status: pendencia.status
        });
    } catch (error) {
        console.error('Erro ao buscar resultado:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// =============================================
// ROTA PARA CHAT IA (se precisar)
// =============================================
app.post('/api/pendings/chat', async (req, res) => {
    try {
        const { message, role } = req.body;
        
        // Aqui você integraria com uma IA (OpenAI, etc)
        // Por enquanto, resposta simulada
        const responses = {
            'ola': 'Olá! Como posso ajudar?',
            'oi': 'Oi! Em que posso ser útil?',
            'tudo bem': 'Tudo ótimo! E você?',
            'help': 'Comandos disponíveis: /ping, /uptime, /stats, /say, /bot'
        };
        
        const msgLower = message.toLowerCase();
        let response = responses[msgLower] || 'Desculpe, não entendi. Digite /help para ver os comandos.';
        
        res.json({ response });
    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});
