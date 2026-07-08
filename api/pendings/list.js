// api/pendings/list.js
const mongoose = require('mongoose');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    // Responder a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método não permitido' 
        });
    }

    try {
        // Obter a URI do MongoDB das variáveis de ambiente
        const uri = process.env.MONGO_URI;
        
        // Se não houver URI configurada, retornar array vazio
        if (!uri) {
            console.log('MONGO_URI não está configurada nas variáveis de ambiente');
            return res.status(200).json({ 
                success: true, 
                pendings: [],
                debug: {
                    error: 'MONGO_URI não configurada'
                }
            });
        }

        // Conectar ao MongoDB se ainda não estiver conectado
        if (mongoose.connection.readyState !== 1) {
            console.log('Conectando ao MongoDB...');
            await mongoose.connect(uri);
            console.log('Conectado ao MongoDB com sucesso');
        }

        // Obter a referência ao banco de dados
        const db = mongoose.connection.db;
        
        // Listar todas as coleções para debug
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(function(c) {
            return c.name;
        });
        console.log('Coleções disponíveis:', collectionNames);

        // Obter a coleção pendings
        const pendingsCollection = db.collection('pendings');
        
        // Contar total de documentos
        const totalDocuments = await pendingsCollection.countDocuments({});
        console.log('Total de documentos na coleção pendings:', totalDocuments);

        // Buscar todos os documentos ordenados por data de criação (mais recentes primeiro)
        const documents = await pendingsCollection.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        console.log('Documentos encontrados:', documents.length);

        // Se encontrou documentos, logar o primeiro para debug
        if (documents.length > 0) {
            console.log('Primeiro documento (resumido):', JSON.stringify(documents[0]).substring(0, 300));
        }

        // Formatar os documentos para o formato esperado pelo frontend
        const formattedPendings = documents.map(function(doc) {
            // Extrair o comando de várias fontes possíveis
            var command = 'comando';
            
            // Tentar extrair de doc.type
            if (doc.type && doc.type !== 'comando') {
                command = doc.type;
            }
            // Tentar extrair de doc.data.command
            else if (doc.data && doc.data.command && doc.data.command !== 'comando') {
                command = doc.data.command;
            }
            // Tentar extrair de doc.data.type
            else if (doc.data && doc.data.type) {
                command = doc.data.type;
            }
            // Tentar extrair de doc.command
            else if (doc.command && doc.command !== 'comando') {
                command = doc.command;
            }
            // Tentar extrair de doc.name
            else if (doc.name) {
                command = doc.name;
            }

            // Extrair parâmetros
            var params = '';
            if (doc.data && doc.data.params) {
                params = doc.data.params;
            } else if (doc.params) {
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
