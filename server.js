const express = require('express');
const path = require('path'); // Para lidar com caminhos de arquivos
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const { connectToDB } = require('./src/db');
const { initializeAllInstances } = require('./src/baileys');
require('dotenv').config();
const { version } = require('./package.json');
//console.log(`App version: ${version}`);

const app = express();
const PORT = process.env.PORT || 3000; // React e backend na mesma porta
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Swagger Configuration
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: '1Click.AI ChatBots API',
            version: '1.0.0',
            description: 'API endpoints Documentation for managing instances',
        },
        servers: [
            {
                url: SERVER_URL,
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: ['./src/api/routes/*.js'], // Caminho para as rotas documentadas
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware para validar API_KEY
function validateAPIKey(req, res, next) {
    const clientApiKey = req.headers['authorization']?.replace('Bearer ', '');
    const serverApiKey = process.env.API_KEY;

    if (!clientApiKey || clientApiKey !== serverApiKey) {
        return res.status(401).json({ message: 'Invalid or missing API key' });
    }

    next();
}

app.use(express.json());

// Rotas da API
app.use('/api/instances', validateAPIKey, require('./src/api/routes/instances'));

// Servir o React em produção
// const buildPath = path.join(__dirname, 'src/dashboard/build');
const buildPath = path.join(__dirname, 'src/manager');
app.use(express.static(buildPath));

// Qualquer rota não capturada é redirecionada para o React
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Conectar ao banco de dados e inicializar
connectToDB()
    .then(() => {
        console.log('Connected to the database.');
        initializeAllInstances()
            .then(() => {
                console.log(`
                    🚀✨  OnetChat API Service Status ✨🚀
                    --------------------------------------
                    Version: ${version}
                    --------------------------------------
                    ✅  Service has been successfully started!
                    🌐  All instances initialized and ready.
                    📡  Listening for requests...
                    --------------------------------------
                    🎉  Happy chatting! 🎉
                    `);                    
            })
            .catch((error) => console.error('Error initializing instances:', error));

        app.listen(PORT, () => {
            console.log('--------------------------------------');
            console.log(`Server running at ${SERVER_URL}`);
            console.log(`API Documentation available at ${SERVER_URL}/api-docs`);
            console.log('--------------------------------------');
        });
    })
    .catch((error) => {
        console.error('Error connecting to the database:', error);
    });
