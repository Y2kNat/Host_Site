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
            return res.status(200).json({ success: true, pendings: [] });
        }

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(uri);
        }

        const db = mongoose.connection.db;
        const collection = db.collection('pendings');
        
        const docs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        var formatted = [];
        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            
            var command = 'comando';
            if (doc.type && doc.type !== 'comando') {
                command = doc.type;
            } else if (doc.data && doc.data.command) {
                command = doc.data.command;
            }

            var params = '';
            if (doc.data && doc.data.params) {
                params = doc.data.params;
            } else if (doc.params) {
                params = doc.params;
            }

            var result = '';
            if (doc.data && doc.data.result) {
                result = doc.data.result;
            } else if (doc.result) {
                result = doc.result;
            }

            var done = false;
            if (doc.done === true || doc.done === 'true') {
                done = true;
            }

            formatted.push({
                id: doc._id ? doc._id.toString() : '0',
                command: command,
                params: params,
                result: result,
                done: done,
                createdAt: doc.createdAt || new Date()
            });
        }

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
};
