const { 
    resetQRCodeCounter, 
    initializeWhatsAppBot, 
    stopInstance, 
    instances, 
    initializeTelegramBot, 
    initializeDiscordBot,
    sendMessageWhatsApp, 
    sendMessageTelegram, 
    sendMessageDiscord,
} = require('../../baileys');
const db = require('../../db');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Certifique-se de instalar o axios para fazer a requisição HTTP

// Caminho base para as pastas de sessões
const sessionsBasePath = path.join(__dirname, '../../sessions');

// Criar uma nova instância e iniciá-la automaticamente
async function createInstance(req, res) {
    const { udid } = req.body;

    if (!udid) {
        return res.status(400).send({ message: 'UDID is required' });
    }

    try {
        const sessionPath = `sessions/${udid}`;

        const result = await db.query('SELECT * FROM instances WHERE udid = $1', [udid]);
        const instance = result.rows[0];

        if (instance) {
            return res.status(400).send({ message: 'Instance already exists', instance });
        }

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Session folder for instance ${udid} deleted.`);
        }

        // Insere no banco dados do Telegram e WhatsApp
        await db.query(
            `INSERT INTO instances (udid, phone_number, status, qr_code, name, profile_picture, telegram_api_key, telegram_status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [udid, null, 'disconnected', null, null, null, null || null, 'disconnected']
        );

        // Inicializar o WhatsApp
        await initializeWhatsAppBot(udid);


        res.status(201).send({ message: 'Instance created', udid });
    } catch (error) {
        console.error('Error creating instance:', error);
        res.status(500).send({ message: 'Failed to create instance', error: error.message });
    }
}



// Função para deletar uma instância e sua pasta de sessão
async function deleteInstance(req, res) {
    const { id } = req.params;

    try {
        // Verificar se a instância existe
        const result = await db.query('SELECT * FROM instances WHERE udid = $1', [id]);
        const instance = result.rows[0];

        if (!instance) {
            return res.status(404).send({ message: 'Instance not found' });
        }

        // Verificar se a instância está ativa
        if (instances[id]) {
            try {
                if (instances[id].state?.connection === 'open') {
                    await instances[id].logout(); // Desconectar o número
                    console.log(`Instance ${id} logged out.`);
                } else {
                    console.warn(`Instance ${id} is already disconnected.`);
                }
            } catch (error) {
                console.warn(`Error during logout for instance ${id}:`, error.message);
            }

            // Garantir que a instância seja removida            
            await stopInstance(id, 'telegram');
            await stopInstance(id, 'discord');
            await stopInstance(id, 'whatsapp');
        }

        // Caminho para a pasta da sessão
        const sessionPath = path.join(sessionsBasePath, id);

        // Verificar e remover a pasta da sessão
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Session folder for instance ${id} deleted.`);
        } else {
            console.log(`Session folder for instance ${id} not found.`);
        }

        // Remover a instância do banco de dados
        await db.query('DELETE FROM instances WHERE udid = $1', [id]);

        res.status(200).send({ message: 'Instance deleted and stopped, session folder removed' });
    } catch (error) {
        console.error('Error deleting instance:', error);
        res.status(500).send({ message: 'Failed to delete instance', error: error.message });
    }
}



// Listar todas as instâncias
async function listInstances(req, res) {
    // console.log('[API REQUEST]: GET /api/instances');
    // console.log('[HEADERS]:', req.headers);

    try {
        console.log('Fetching instances from database...');
        const result = await db.query('SELECT * FROM instances');
        console.log(`Database returned ${result.rows.length} rows.`);

        res.status(200).send(result.rows);
    } catch (error) {
        console.error('Error listing instances:', error.message);
        res.status(500).send({ message: 'Failed to list instances', error: error.message });
    }
}

// Obter o QR Code de uma instância
async function getQRCode(req, res) {
    const { id } = req.params;

    try {

        // Buscar informações da instância no banco de dados
        const result = await db.query(
            'SELECT qr_code, status, phone_number, name, profile_picture, telegram_api_key FROM instances WHERE udid = $1',
            [id]
        );
        const instance = result.rows[0];

        if (!instance) {
            return res.status(404).send({ message: 'Instance not found' });
        }

        let telegramBotInfo = {};

        // Reseta o contador do QR Code
        resetQRCodeCounter();
        
        if (instance.telegram_api_key) {
            try {
                // Chamada à API do Telegram para obter as informações do bot
                const telegramResponse = await axios.get(
                    `https://api.telegram.org/bot${instance.telegram_api_key}/getMe`
                );

                if (telegramResponse.data.ok) {
                    const tgResult = telegramResponse.data.result;
                    telegramBotInfo = {
                        tg_first_name: tgResult.first_name,
                        tg_username: tgResult.username,
                    };
                }
            } catch (tgError) {
                console.error('Error fetching Telegram Bot info:', tgError.message);
                // Opcional: Manter telegramBotInfo vazio ou definir um valor padrão
            }
        }

        // Enviar a resposta final combinando as informações do banco e do bot Telegram
        res.status(200).send({
            qr_code: instance.qr_code,
            status: instance.status,
            phone_number: instance.phone_number,
            name: instance.name,
            profile_picture: instance.profile_picture,
            ...telegramBotInfo, // Adiciona informações do bot do Telegram, se disponíveis
        });
    } catch (error) {
        console.error('Error fetching QR Code:', error);
        res.status(500).send({ message: 'Failed to fetch QR Code', error: error.message });
    }
}


// Atualizar o webhook de uma instância
async function updateWebhook(req, res) {
    const { id } = req.params;
    const { webhook, webhook_key, telegram_api_key, discord_bot_token } = req.body;

    try {
        // Verificar se a instância existe
        const result = await db.query('SELECT * FROM instances WHERE udid = $1', [id]);
        const instance = result.rows[0];

        if (!instance) {
            return res.status(404).send({ message: 'Instance not found' });
        }

        // Construir a query dinamicamente com base nos campos fornecidos
        const fields = [];
        const values = [];
        let index = 1;

        if (webhook !== undefined) {
            fields.push(`webhook = $${index++}`);
            values.push(webhook || null); // Apaga o campo se `webhook` for vazio ou null
        }

        if (webhook_key !== undefined) {
            fields.push(`webhook_key = $${index++}`);
            values.push(webhook_key || null); // Apaga o campo se `webhook_key` for vazio ou null
        }

        // Validação para discord_bot_token
        if (discord_bot_token !== undefined) {
            fields.push(`discord_bot_token = $${index++}`);
            values.push(discord_bot_token || null); // Apaga o campo se for vazio ou null

            // Inicializar ou parar o bot Discord
            if (discord_bot_token) {
                console.log(`Initializing Discord bot for instance ${id}...`);
                await initializeDiscordBot(id, discord_bot_token); // Inicializa o bot Discord
            } else {
                console.log(`Stopping Discord bot for instance ${id}...`);
                await stopInstance(id, 'discord'); // Parar o bot Discord
                fields.push(`discord_bot_name = NULL`, `discord_status = NULL`);
            }
        }

        // Validação para telegram_api_key
        let isTelegramKeyValid = false;
        if (telegram_api_key !== undefined) {
            // Substituir por sua lógica real de validação da API key do Telegram
            isTelegramKeyValid = await validateTelegramApiKey(telegram_api_key);

            if (isTelegramKeyValid) {
                fields.push(`telegram_api_key = $${index++}`);
                values.push(telegram_api_key);
                console.log(`Initializing Telegram bot for instance ${id}...`);
                await initializeTelegramBot(id, telegram_api_key); // Inicializa o bot Telegram
            } else {
                // Apagar os campos relacionados ao Telegram se a API key for inválida
                fields.push(`telegram_api_key = NULL`, `telegram_status = NULL`);
                console.log(`Stopping Telegram bot for instance ${id}...`);
                await stopInstance(id, 'telegram'); // Parar o bot Telegram
            }
        }

        if (fields.length === 0) {
            // Nenhum campo enviado, apaga todos
            await db.query(
                `UPDATE instances SET webhook = NULL, webhook_key = NULL, telegram_api_key = NULL, telegram_status = NULL, discord_bot_token = NULL, discord_status = NULL, updated_at = NOW() WHERE udid = $1`,
                [id]
            );
            return res.status(200).send({ message: 'All webhooks and API keys removed successfully' });
        }

        // Atualizar os campos especificados
        await db.query(
            `UPDATE instances SET ${fields.join(', ')}, updated_at = NOW() WHERE udid = $${index}`,
            [...values, id]
        );

        res.status(200).send({ message: 'Webhook and/or API keys updated successfully' });
    } catch (error) {
        console.error('Error updating webhooks and API keys:', error);
        res.status(500).send({ message: 'Failed to update webhooks and/or API keys', error: error.message });
    }
}


// Função fictícia para validação da API key do Telegram
async function validateTelegramApiKey(apiKey) {
    // Substituir com a lógica real de validação, por exemplo, uma chamada à API do Telegram
    return apiKey && apiKey.length > 10; // Exemplo simples de validação
}






// Desconectar e reiniciar uma instância
async function disconnectInstance(req, res) {
    const { id } = req.params;

    try {
        // Verificar se a instância existe no banco de dados
        const result = await db.query('SELECT * FROM instances WHERE udid = $1', [id]);
        const instance = result.rows[0];

        if (!instance) {
            return res.status(404).send({ message: 'Instance not found' });
        }

        // Deslogar e parar a instância ativa, mesmo que o logout falhe
        if (instances[id]) {
            try {
                await instances[id].logout(); // Tentar desconectar o número
                console.log(`Instance ${id} logged out.`);
            } catch (logoutError) {
                console.error(`Failed to log out instance ${id}:`, logoutError);
            }
        }

        // Continuar com a parada da instância
        try {
            await stopInstance(id, 'whatsapp');
            console.log(`Instance ${id} stopped.`);
        } catch (stopError) {
            console.error(`Failed to stop instance ${id}:`, stopError);
        }

        // Apagar os dados da sessão
        const sessionPath = path.join(__dirname, '../../../sessions', id);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`Session data for instance ${id} removed.`);
        } else {
            console.log(`No session data found for instance ${id}.`);
        }

        // Atualizar o status no banco e zerar o phone_number
        try {
            await db.query(
                'UPDATE instances SET status = $1, phone_number = NULL, profile_picture = NULL, updated_at = NOW() WHERE udid = $2',
                ['disconnected', id]
            );
            console.log(`Database updated for instance ${id}.`);
        } catch (dbUpdateError) {
            console.error(`Failed to update database for instance ${id}:`, dbUpdateError);
        }

        // Reiniciar a instância
        try {
            initializeWhatsAppBot(id);
            console.log(`Instance ${id} restarted.`);
        } catch (initializeError) {
            console.error(`Failed to restart instance ${id}:`, initializeError);
        }

        res.status(200).send({ message: 'Instance disconnected and restarted' });
    } catch (error) {
        console.error('Error disconnecting instance:', error);
        res.status(500).send({ message: 'Failed to disconnect instance', error: error.message });
    }
}



// Enviar mensagem por uma instância específica
async function sendMessage(req, res) {
    const { id } = req.params;
    const { platform, recipient, message } = req.body;

    if (!platform || !recipient || !message) {
        return res.status(400).send({ message: 'Platform, recipient, and message are required.' });
    }

    try {
        if (platform === 'whatsapp') {
            await sendMessageWhatsApp(id, recipient, message);
        } else if (platform === 'telegram') {
            await sendMessageTelegram(id, recipient, message);
        } else if (platform === 'discord') {
            await sendMessageDiscord(id, recipient, message);
        } else {
            return res.status(400).send({ message: 'Invalid platform specified.' });
        }

        res.status(200).send({ message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send({ message: 'Failed to send message.', error: error.message });
    }
}



module.exports = {
    createInstance,
    deleteInstance,
    listInstances,
    updateWebhook,
    getQRCode,
    disconnectInstance,
    sendMessage,
};
