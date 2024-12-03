const {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const db = require('../db');
const fs = require('fs');
const HttpsProxyAgent = require('https-proxy-agent');
require('dotenv').config(); // Carregar as variáveis do .env
const pino = require('pino'); // Biblioteca para logs
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { platform } = require('os');
const { Client, GatewayIntentBits, Partials } = require('discord.js');


const telegramBots = {}; // Armazena bots por ID de instância
const discordBots = {}; // Armazena bots do Discord por ID de instância
const instances = {};

const qrCodeCounters = {}; // Armazena contadores por ID de instância
const QR_CODE_LIMIT = 10; // Limite de geração de QR codes

let fetch;

(async () => {
    fetch = (await import('node-fetch')).default;
})();

// Verificar se as configurações de proxy estão completas no .env
const proxyHost = process.env.PROXY_HOST;
const proxyPort = process.env.PROXY_PORT;
const proxyProtocol = process.env.PROXY_PROTOCOL;
const proxyUsername = process.env.PROXY_USERNAME;
const proxyPassword = process.env.PROXY_PASSWORD;
const logLevel = process.env.LOG_LEVEL || 'info'; // Padrão é 'info'

let proxyAgent = null;


async function initializeDiscordBot(id, token) {
    if (!token) return;

    if (discordBots[id]) {
        console.log(`Discord bot for instance ${id} is already running.`);
        return;
    }

    try {
        const bot = new Client({
            intents: [
                GatewayIntentBits.Guilds,           // Para interagir com servidores
                GatewayIntentBits.GuildMessages,   // Para mensagens em servidores
                GatewayIntentBits.MessageContent,  // Para ler o conteúdo das mensagens
                GatewayIntentBits.DirectMessages,  // Necessário para mensagens diretas (DM)
            ],
            partials: [Partials.Channel], // Necessário para receber DMs
        });

        bot.on('ready', async() => {
            console.log(`Discord bot connected as ${bot.user.tag}`);

            try {
                // Atualizar o nome do bot no banco de dados
                await db.query(
                    'UPDATE instances SET discord_bot_name = $1 WHERE udid = $2',
                    [bot.user.tag, id]
                );
        
                console.log(`Discord bot name updated to '${bot.user.tag}' for instance ${id}`);
            } catch (error) {
                console.error(`Failed to update Discord bot name for instance ${id}:`, error.message);
            }            

        });

        bot.on('messageCreate', async (message) => {
            // Ignorar mensagens de outros bots
            if (message.author.bot) return;

            // Verifica se o bot foi mencionado na mensagem
            if (message.mentions.has(bot.user.id)) {
                // O bot foi mencionado;
            }else{
                if (!message.guild) {
                    // Mensagem privada
                } else {
                    // Mensagem em um servidor
                    return;
                }
            }

            // Log de mensagens recebidas
            if (!message.guild) {
                console.log(`[DEBUG] Received DM: ${message.content} from ${message.author.tag}`);
            } else {
                console.log(`[DEBUG] Received guild message: ${message.content} in ${message.guild.name} from ${message.author.tag}`);
            }

            // Buscar webhook configurado no banco
            const result = await db.query('SELECT webhook, webhook_key FROM instances WHERE udid = $1', [id]);
            const instance = result.rows[0];

            if (instance?.webhook) {
                try {
                    const response = await axios.post(
                        instance.webhook,
                        {
                            platform: 'discord',
                            id: message.channel.id,
                            user: message.author.id,
                            message: message.content,
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${instance.webhook_key}`,
                            },
                        }
                    );
                    console.log(`Message sent to webhook: ${instance.webhook}`);
                    console.log(`Webhook response:`, response.data);

                    if (!message.guild) {
                        // Enviar uma mensagem como resposta
                        console.log(`Received DM from ${message.author.tag}: ${message.content}`);                        
                        // message.channel.send(response.data.message);
                        await message.reply(response.data.message);
                    } else {
                        // É uma mensagem em um servidor
                        console.log(`Received message in guild ${message.guild.name} from ${message.author.tag}: ${message.content}`);
                        await message.reply(response.data.message);
                    }                    
                  
                } catch (error) {
                    console.error(`Error sending Discord message to webhook: ${error.message}`);
                }
            }
        });

        bot.on('error', (error) => {
            console.error(`Discord bot error for instance ${id}:`, error.message);
        });

        bot.on('shardError', (error) => {
            console.error(`Discord bot shard error for instance ${id}:`, error.message);
        });

        await bot.login(token);
        discordBots[id] = bot;

        // Atualiza o status no banco
        await db.query('UPDATE instances SET discord_status = $1 WHERE udid = $2', ['connected', id]);

        console.log(`Discord bot initialized for instance ${id}`);
    } catch (error) {
        console.error(`Failed to initialize Discord bot for instance ${id}:`, error.message);

        // Atualiza o status no banco para indicar falha
        await db.query('UPDATE instances SET discord_status = $1 WHERE udid = $2', ['failed', id]);

        // Log do erro para monitoramento
        console.error(error.stack || error);
    }
}







async function initializeTelegramBot(id, apiKey) {
    if (!apiKey) return;

    if (telegramBots[id]) {
        console.log(`Telegram bot for instance ${id} is already running.`);
        return;
    }

    try {
        const bot = new TelegramBot(apiKey, { polling: true });

        bot.on('message', async (msg) => {
            try {
                console.log(`Received message on Telegram for instance ${id}: ${msg.text}`);
                const chatId = msg.chat.id;
                const fromId = msg.from.id;
                const text = msg.text;
                const messageId = msg.message_id; // ID da mensagem recebida

                // Buscar webhook do banco
                const result = await db.query('SELECT webhook, webhook_key FROM instances WHERE udid = $1', [id]);
                const instance = result.rows[0];

                if (instance?.webhook) {
                    try {
                        const response = await axios.post(
                            instance.webhook,
                            {
                                platform: 'telegram',
                                id: chatId,
                                user: chatId,
                                message: text,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${instance.webhook_key}`,
                                },
                            }
                        );
                        console.log(`Message sent to webhook: ${instance.webhook}`);
                        console.log(`Webhook response:`, response.data);

                        // Enviar uma mensagem como resposta
                        bot.sendMessage(chatId, response.data.message, {
                            reply_to_message_id: messageId,
                        });
                    } catch (error) {
                        console.error(`Error sending Telegram message to webhook: ${error.message}`);
                    }
                }
            } catch (msgError) {
                console.error(`Error processing Telegram message for instance ${id}:`, msgError.message);
            }
        });

        bot.on('polling_error', (error) => {
            console.error(`Telegram polling error for instance ${id}:`, error.message);
        });

        telegramBots[id] = bot;

        // Atualiza o status no banco
        await db.query('UPDATE instances SET telegram_status = $1 WHERE udid = $2', ['connected', id]);

        console.log(`Telegram bot initialized for instance ${id}`);
    } catch (error) {
        console.error(`Failed to initialize Telegram bot for instance ${id}:`, error.message);

        // Atualiza o status no banco para indicar falha
        await db.query('UPDATE instances SET telegram_status = $1 WHERE udid = $2', ['failed', id]);

        // Log do erro para monitoramento
        console.error(error.stack || error);
    }
}



async function initializeWhatsAppBot(id) {

    // Remover instância existente, se necessário
    await stopInstance(id, 'telegram');
    await stopInstance(id, 'discord');
    await stopInstance(id, 'whatsapp');

    const result = await db.query('SELECT telegram_api_key, discord_bot_token FROM instances WHERE udid = $1', [id]);
    const { telegram_api_key, discord_bot_token } = result.rows[0];

    if (telegram_api_key) {
        await initializeTelegramBot(id, telegram_api_key);
    }
    
    if (discord_bot_token) {
        await initializeDiscordBot(id, discord_bot_token);
    }

    const sessionPath = `sessions/${id}`;

    // Criar pasta de sessões se não existir
    if (!fs.existsSync('sessions')) {
        fs.mkdirSync('sessions');
    }

    // Configurar o estado de autenticação para a instância
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log('========================================');
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);
    console.log(`1CLICK WP INSTANCE: ${id}`);
    console.log('========================================');

    const sock = makeWASocket({
        logger: pino({ level: logLevel }), // Usa o nível de log do .env
        agent: proxyAgent, // Configurar o proxy, se disponível
        printQRInTerminal: false,
        auth: state,
        browser: ['Linux', 'Chrome', 'latest'],
    });

    instances[id] = sock;

    // Monitorar atualizações de conexão
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {

            console.log('========================================');
            console.log('Telegram Total:', Object.keys(telegramBots).length);
            console.log('Discord Total:', Object.keys(discordBots).length);
            console.log('WhatsApp Total:', Object.keys(instances).length);
            console.log('========================================');

            console.log(`QR Code for instance ${id}: ${qr}`);
            try {
                // Salvar QR Code no banco de dados
                await db.query(
                    'UPDATE instances SET qr_code = $1, updated_at = NOW() WHERE udid = $2',
                    [qr, id]
                );
            } catch (error) {
                console.error('Error saving QR Code to database:', error);
            }

            // Inicialize o contador se ainda não existir
            if (!qrCodeCounters[id]) {
                qrCodeCounters[id] = 0;
            }

            // Incrementar o contador para esta instância
            qrCodeCounters[id]++;
            console.log(`QR Code generation count for instance ${id}: ${qrCodeCounters[id]}`);

            // Verificar se o limite foi atingido
            if (qrCodeCounters[id] > QR_CODE_LIMIT) {
                console.log(`Instance ${id} reached the QR code generation limit. Stopping instance.`);
                await pauseInstance(id, 'whatsapp');
                delete qrCodeCounters[id]; // Limpar contador para evitar uso futuro
                return;
            }

        }

        if (connection === 'open') {
            console.log(`Instance ${id} connected.`);
            // Resetar o contador ao conectar com sucesso
            qrCodeCounters[id] = 0;            

            try {
                // Extraindo o número do WhatsApp conectado
                let numero = null;
                let nome = null;
                let imagemBase64 = null;

                if (sock?.user?.id) {
                    numero = sock.user.id.split(':')[0]; // Extraindo o número antes de ":"
                }

                // Obtendo o nome do usuário conectado (se disponível)
                if (sock?.user?.name) {
                    nome = sock.user.name;
                }

                // Buscando a URL da imagem do perfil
                const imageUrl = await sock.profilePictureUrl(sock.user.id, 'image').catch(() => null);

                if (imageUrl) {
                    try {
                        // Baixar a imagem do perfil usando fetch
                        const response = await fetch(imageUrl);

                        if (response.ok) {
                            // Converter para buffer e para base64
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            imagemBase64 = buffer.toString('base64');
                        } else {
                            console.error(`Failed to fetch profile picture: ${response.statusText}`);
                        }
                    } catch (error) {
                        console.error('Error fetching profile picture:', error);
                    }
                }

                // Atualizar o banco de dados com as informações
                await db.query(
                    'UPDATE instances SET phone_number = $1, qr_code = NULL, name = $2, profile_picture = $3, status = $4, updated_at = NOW() WHERE udid = $5',
                    [numero, nome, imagemBase64, 'connected', id]
                );

                console.log(`Phone number, name, and profile picture updated for instance ${id}.`);
            } catch (error) {
                console.error('Error updating phone number, name, or profile picture in database:', error);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : false;

            console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                // Reconectar automaticamente
                initializeWhatsAppBot(id);
            } else {
                // Atualizar status como desconectado no banco
                try {
                    await db.query(
                        'UPDATE instances SET status = $1, profile_picture = NULL, updated_at = NOW() WHERE udid = $2',
                        ['disconnected', id]
                    );
                    
                } catch (error) {
                    console.error('Error updating disconnection status:', error);
                }
            }
        }
    });


    // Envio para o webhook (dentro do evento messages.upsert)
    sock.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key.fromMe) return;
        // console.log('New message:', m);

        const message = m.messages[0];
        const user = message.key.remoteJid;
        const content = message.message?.conversation || message.message?.extendedTextMessage?.text;

        console.log(`Message from ${user}: ${content}`);

        // AGUARDAR 1 SEGUNDO
        await new Promise(r => setTimeout(r, 1000));

        const messages = m.messages[0];
        if (!messages.message) return; // Se não houver mensagem de texto ou mídia

        let remoteJid = m.messages[0].key.remoteJid;
        let messageText = m.messages[0].message.conversation || '';

        const participant = m.messages[0].key?.participant;
        const imageMessage = m.messages[0].message?.imageMessage?.mimetype;
        const audioMessage = m.messages[0].message?.audioMessage?.mimetype;
        const documentMessage = m.messages[0].message?.documentMessage?.mimetype;
        const captionImg = m.messages[0].message?.imageMessage?.caption;
        const captionDoc = m.messages[0].message?.documentMessage?.caption;
        const messageTimestamp = m.messages[0].messageTimestamp;


        const myNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const userNumber = remoteJid.split('@')[0];
        console.log(`Meu número de telefone completo: ${myNumber}`);

        // GRUPO
        if (participant) {

            nome = "";

            console.log('================== GRUPO ======================');
            console.log(JSON.stringify(m.messages[0].message, null, 2));
            console.log('===============================================');
            console.log('================== ALL ======================');
            console.log(JSON.stringify(m.messages[0], null, 2));
            console.log('===============================================');

            return;

            if (
                m.messages[0].message?.audioMessage?.contextInfo?.mentionedJid[0] === myNumber ||
                m.messages[0].message?.imageMessage?.contextInfo?.mentionedJid[0] === myNumber ||
                // m.messages[0].message?.documentMessage?.contextInfo?.mentionedJid[0] === myNumber ||
                m.messages[0].message?.audioMessage?.contextInfo?.participant === myNumber ||
                m.messages[0].message?.imageMessage?.contextInfo?.participant === myNumber ||
                m.messages[0].message?.extendedTextMessage?.contextInfo?.mentionedJid[0] === myNumber ||
                m.messages[0].message?.extendedTextMessage?.contextInfo?.participant === myNumber
            ) {
                // remoteJid = m.messages[0].key.participant;
                if (imageMessage) {
                    messageText = captionImg;
                } else if (documentMessage) {
                    messageText = captionDoc;
                } else {
                    messageText = m.messages[0].message?.extendedTextMessage?.text;
                }
            } else {
                return;
            }
        }


        // INDIVIDUAL
        // pass to readMessages function
        // can pass multiple keys to read multiple messages as well
        await sock.readMessages([m.messages[0].key]);

        const messageType = Object.keys(messages.message)[0]; // Obtém o tipo de mensagem (texto, imagem, vídeo, documento, etc.)
        // const audioMessage = m.messages[0].message?.audioMessage?.mimetype;
        let nomeCompleto = m.messages[0].pushName;
        let nome = nomeCompleto.split(' ')[0];

        console.log('Nome completo do contato:', nomeCompleto);
        console.log('Nome do contato:', nome);


        try {
            // Buscar webhook configurado no banco
            const result = await db.query('SELECT webhook, webhook_key FROM instances WHERE udid = $1', [id]);
            const instance = result.rows[0];
            console.log('Instance:', instance);

            if (instance?.webhook) {
                // Enviar mensagem ao webhook usando axios
                const response = await axios.post(instance.webhook, {
                    platform: 'whatsApp',
                    id: userNumber,
                    user,
                    message: content,
                }, {
                    headers: {
                        Authorization: `Bearer ${instance.webhook_key}`, // Inclui o webhook_key no header
                    },
                });
                console.log(`Message sent to webhook: ${instance.webhook}`);
                console.log(`Resposta do webhook:`, response.data);

                await sock.sendMessage(
                    remoteJid,
                    { text: response.data.message },
                    { quoted: m.messages[0] }
                );
                return;

            } else {
                console.log(`No webhook configured for instance ${id}`);
            }
        } catch (error) {
            console.error('Error sending message to webhook:', error.message);
        }
    });


    sock.ev.on('creds.update', saveCreds);

    return sock;
}

async function initializeAllInstances() {
    try {
        // Buscar todas as instâncias do banco de dados
        const result = await db.query('SELECT udid, telegram_api_key, discord_bot_token FROM instances');
        const instancesFromDB = result.rows;

        // Iniciar cada instância automaticamente
        for (const instance of instancesFromDB) {
            const { udid, telegram_api_key, discord_bot_token } = instance;

            // Inicializar a instância base (WhatsApp ou similar)
            if (!instances[udid]) {
                console.log(`Initializing instance: ${udid}`);
                await initializeWhatsAppBot(udid);
            }

            // Inicializar o bot do Telegram, se a chave estiver presente
            if (telegram_api_key && !telegramBots[udid]) {
                console.log(`Initializing Telegram bot for instance: ${udid}`);
                await initializeTelegramBot(udid, telegram_api_key);
            }

            // Inicializar o bot do Discord, se o token estiver presente
            if (discord_bot_token && !discordBots[udid]) {
                console.log(`Initializing Discord bot for instance: ${udid}`);
                await initializeDiscordBot(udid, discord_bot_token);
            }
        }
    } catch (error) {
        console.error('Error initializing instances:', error);
    }
}


async function stopInstance(id, platform) {
    if (platform === 'telegram') {
        if (telegramBots[id]) {
            try {
                await telegramBots[id].stopPolling();
                delete telegramBots[id];
                console.log(`Telegram bot for instance ${id} stopped.`);
            } catch (err) {
                console.error(`Error stopping Telegram bot for instance ${id}:`, err.message);
            }
        }
    }

    if (platform === 'discord') {
        if (discordBots[id]) {
            try {
                await discordBots[id].destroy();
                delete discordBots[id];
                console.log(`Discord bot for instance ${id} stopped.`);
            } catch (err) {
                console.error(`Error stopping Discord bot for instance ${id}:`, err.message);
            }
        }
    }

    if (platform === 'whatsapp') {
        if (instances[id]) {
            try {
                await instances[id].logout();
                instances[id].end();
                delete instances[id];
                console.log(`WhatsApp instance ${id} stopped.`);
                delete qrCodeCounters[id]; // Limpa o contador ao parar a instância
            } catch (err) {
                console.error(`Error stopping WhatsApp instance ${id}:`, err.message);
            }
        }
    }
}

async function pauseInstance(id, platform) {
    if (platform === 'telegram') {
        if (telegramBots[id]) {
            try {
                // await telegramBots[id].stopPolling();
                delete telegramBots[id];
                console.log(`Telegram bot for instance ${id} stopped.`);
            } catch (err) {
                console.error(`Error stopping Telegram bot for instance ${id}:`, err.message);
            }
        }
    }

    if (platform === 'discord') {
        if (discordBots[id]) {
            try {
                // await discordBots[id].destroy();
                delete discordBots[id];
                console.log(`Discord bot for instance ${id} stopped.`);
            } catch (err) {
                console.error(`Error stopping Discord bot for instance ${id}:`, err.message);
            }
        }
    }

    if (platform === 'whatsapp') {
        if (instances[id]) {
            try {
                // await instances[id].logout();
                // instances[id].end();
                delete instances[id];
                console.log(`WhatsApp instance ${id} stopped.`);
                delete qrCodeCounters[id]; // Limpa o contador ao parar a instância
            } catch (err) {
                console.error(`Error stopping WhatsApp instance ${id}:`, err.message);
            }
        }
    }
}

function resetQRCodeCounter(id) {
    if (qrCodeCounters[id]) {
        qrCodeCounters[id] = 0;
        console.log(`QR Code counter for instance ${id} has been reset.`);
    }
}

async function sendMessageWhatsApp(instanceId, recipient, message) {
    if (!instances[instanceId]) {
        throw new Error(`WhatsApp instance ${instanceId} not found or not connected.`);
    }
    await instances[instanceId].sendMessage(`${recipient}@s.whatsapp.net`, { text: message });
}

async function sendMessageTelegram(instanceId, recipient, message) {
    if (!telegramBots[instanceId]) {
        throw new Error(`Telegram bot ${instanceId} not found or not connected.`);
    }
    await telegramBots[instanceId].sendMessage(recipient, message);
}

async function sendMessageDiscord(instanceId, channelId, message) {
    if (!discordBots[instanceId]) {
        throw new Error(`Discord bot ${instanceId} not found or not connected.`);
    }

    const channel = await discordBots[instanceId].channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
        throw new Error(`Invalid Discord channel or recipient for instance ${instanceId}.`);
    }

    await channel.send(message);
}

module.exports = { 
    resetQRCodeCounter, 
    initializeWhatsAppBot, 
    stopInstance, 
    initializeAllInstances, 
    instances, 
    initializeTelegramBot, 
    initializeDiscordBot,
    sendMessageWhatsApp,
    sendMessageTelegram,
    sendMessageDiscord,    
};
