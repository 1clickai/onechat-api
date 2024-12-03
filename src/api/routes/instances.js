const express = require('express');
const router = express.Router();
const {
    createInstance,
    deleteInstance,
    listInstances,
    getQRCode,
    updateWebhook,
    disconnectInstance,
    sendMessage
} = require('../controllers/instances');

/**
 * @swagger
 * /api/instances:
 *   post:
 *     summary: Create a new instance
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               udid:
 *                 type: string
 *                 description: Unique identifier for the instance.
 *                 example: "unique-id-123"
 *     responses:
 *       201:
 *         description: Instance created successfully.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.post('/', createInstance);

/**
 * @swagger
 * /api/instances/{id}:
 *   delete:
 *     summary: Delete an instance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier for the instance.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instance deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Instance not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:id', deleteInstance);

/**
 * @swagger
 * /api/instances:
 *   get:
 *     summary: List all instances
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of instances.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique numeric identifier for the instance.
 *                   udid:
 *                     type: string
 *                     description: Unique UUID identifier for the instance.
 *                   phone_number:
 *                     type: string
 *                     nullable: true
 *                     description: Phone number associated with the instance, if available.
 *                   status:
 *                     type: string
 *                     description: Connection status of the instance (e.g., connected, disconnected).
 *                   qr_code:
 *                     type: string
 *                     nullable: true
 *                     description: QR Code associated with the instance for authentication, if available.
 *                   session_data:
 *                     type: string
 *                     nullable: true
 *                     description: Session data associated with the instance, if available.
 *                   name:
 *                     type: string
 *                     nullable: true
 *                     description: Name associated with the instance, if available.
 *                   profile_picture:
 *                     type: string
 *                     nullable: true
 *                     description: Base64-encoded profile picture of the instance, if available.
 *                   webhook:
 *                     type: string
 *                     nullable: true
 *                     description: The webhook URL configured for the instance, if available.
 *                   webhook_key:
 *                     type: string
 *                     nullable: true
 *                     description: The secure key for the webhook, if configured.
 *                   telegram_api_key:
 *                     type: string
 *                     nullable: true
 *                     description: Telegram API key for the bot, if configured.
 *                   telegram_status:
 *                     type: string
 *                     description: Status of the Telegram bot for this instance (e.g., connected, disconnected).
 *                   discord_bot_token:
 *                     type: string
 *                     nullable: true
 *                     description: Discord bot token for the bot, if configured.
 *                   discord_status:
 *                     type: string
 *                     description: Status of the Discord bot for this instance (e.g., connected, disconnected).
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the instance was created.
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the instance was last updated.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get('/', listInstances);



/**
 * @swagger
 * /api/instances/{id}/data:
 *   get:
 *     summary: Get instance data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier for the instance.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instance data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Connection status of the instance.
 *                 phone_number:
 *                   type: string
 *                   nullable: true
 *                   description: Phone number associated with the instance, if available.
 *                 name:
 *                   type: string
 *                   description: Name of the instance.
 *                 profile_picture:
 *                   type: string
 *                   nullable: true
 *                   description: URL to the profile picture, if available.
 *                 tg_first_name:
 *                   type: string
 *                   nullable: true
 *                   description: First name associated with the instance's Telegram account.
 *                 tg_username:
 *                   type: string
 *                   nullable: true
 *                   description: Username of the instance's Telegram account.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Instance not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:id/data', getQRCode);


/**
 * @swagger
 * /api/instances/{id}/webhook:
 *   patch:
 *     summary: Update webhook URLs and API keys for an instance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier for the instance.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               webhook:
 *                 type: string
 *                 description: The WhatsApp webhook URL.
 *                 example: "https://your-whatsapp-webhook-url.com"
 *               webhook_key:
 *                 type: string
 *                 description: The key for securing WhatsApp webhook requests.
 *                 example: "secure-key-for-whatsapp"
 *               telegram_api_key:
 *                 type: string
 *                 description: Telegram API key for the bot.
 *                 example: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
 *     responses:
 *       200:
 *         description: Webhooks and/or API keys updated successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Instance not found.
 *       500:
 *         description: Internal server error.
 */
router.patch('/:id/webhook', updateWebhook);



/**
 * @swagger
 * /api/instances/{id}/disconnect:
 *   post:
 *     summary: Disconnect an instance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier for the instance.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instance disconnected successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Instance not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/:id/disconnect', disconnectInstance);


/**
 * @swagger
 * /api/instances/{id}/send-message:
 *   post:
 *     summary: Send a message using a specific instance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier for the instance.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 description: Platform to send the message (whatsapp, telegram, discord).
 *                 example: "whatsapp"
 *               recipient:
 *                 type: string
 *                 description: Recipient identifier (phone number for WhatsApp, chat ID for Telegram, channel ID for Discord).
 *                 example: "1234567890"
 *               message:
 *                 type: string
 *                 description: Message to be sent.
 *                 example: "Hello, this is a test message."
 *     responses:
 *       200:
 *         description: Message sent successfully.
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Instance not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/:id/send-message', sendMessage);


module.exports = router;
