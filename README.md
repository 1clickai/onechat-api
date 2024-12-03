
# 🌟 OneChat API by 1Click.AI 🚀

Welcome to **OneChat API** – a powerful, easy-to-use instance server system developed by **[1Click.AI](https://1click.ai)**. 🎉 This repository provides everything you need to set up and manage your own instance server for seamless multi-platform bot automation. 

![OneChat API](https://i.imgur.com/a3C94a7.jpeg)

---

## ✨ Features
- 🟢 **Multi-Platform Support**: Connect WhatsApp, Telegram, and Discord instances to the same webhook for unified bot functionality.
- 🟢 **Cross-Platform Presence**: Keep your bot available on WhatsApp, Telegram, Discord, and the 1Click.AI app simultaneously.
- 🔒 **Secure API**: Protect your instance server with an API key.
- 🌐 **OneChat API Documentation**: Explore all API routes with an easy-to-use interface.
- 📊 **Instance Dashboard**: Includes a beautiful, responsive dashboard to monitor and manage instances.
- 💾 **Persistent Sessions**: Sessions are saved to ensure uninterrupted service.
- 🔄 **Docker Ready**: Deploy effortlessly using Docker Compose.

---

## 🎯 What is OneChat API?

![OneChat API](https://i.imgur.com/4kUlSa0.png)

**OneChat API** is an advanced multi-platform bot management system designed for developers and businesses to control multiple bot instances across **WhatsApp**, **Telegram**, and **Discord**. It's powered by **1Click.AI**'s cutting-edge infrastructure and is highly customizable to fit your automation needs.

With **OneChat API**, you can:
- Manage instances in real time.
- Use a single webhook to receive messages and events from multiple platforms.
- Integrate with your own systems using the secure API.
- Streamline operations with webhooks and automation.

---

## 🚀 Getting Started

### Prerequisites
1. **Docker & Docker Compose**: Make sure Docker and Docker Compose are installed.
2. **Node.js**: For local development, install Node.js (if not using Docker).
3. **Git**: Ensure Git is installed to clone the repository.

---

## 🔧 Installation

### Using Docker 🐳

1. **Clone this repository**:
   ```bash
   git clone https://github.com/1clickai/onechat-api.git
   cd onechat-api
   ```

2. **Run the containers**:
   ```bash
   docker-compose up -d
   ```

3. Access your instance server:
   - Dashboard & Backend: [http://localhost:3000](http://localhost:3000)
   - API Documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

### Using EasyPanel 🚀

To deploy using **EasyPanel**, you can use the following JSON schema:
1. In EasyPanel, import the JSON schema above without making any edits to it.

![OneChat API](https://i.imgur.com/OJb9m9r.png)

```json
{
    "services": [
        {
            "type": "app",
            "data": {
                "projectName": "1ClickAI",
                "serviceName": "onechat-api",
                "source": {
                    "type": "image",
                    "image": "ghcr.io/1clickai/onechat-api:latest"
                },
                "domains": [
                    {
                        "host": "$(EASYPANEL_DOMAIN)",
                        "port": 31000
                    }
                ],
                "env": "SERVER_URL=https://$(PRIMARY_DOMAIN)\nAPI_KEY=YOUR_API_KEY\nPROXY_HOST=\nPROXY_PORT=\nPROXY_PROTOCOL=\nPROXY_USERNAME=\nPROXY_PASSWORD=\nLOG_LEVEL=warn\nDB_CONNECTION_STRING=postgres://postgres:secret@$(PROJECT_NAME)_onechat-db:5432/$(PROJECT_NAME)?sslmode=disable",
                "mounts": [
                    {
                        "type": "volume",
                        "name": "node_sessions",
                        "mountPath": "/app/sessions"
                    }
                ]
            }
        },
        {
            "type": "postgres",
            "data": {
                "projectName": "1ClickAI",
                "serviceName": "onechat-db",
                "image": "postgres:16",
                "password": "secret"
            }
        }
    ]
}
```
2. Open your OneChat API Dashboard

![OneChat API](https://i.imgur.com/rV3WsRA.png)

3. To access the dashboard, enter the `YOUR_API_KEY` that you defined in the Environment Variables. If you need to change the `API_KEY`, simply update it in the Environment Variables, then click "Stop," "Deploy," and "Start" to apply the changes.

![OneChat API](https://i.imgur.com/DT8re8K.png)

![OneChat API](https://i.imgur.com/9eHRapy.png)

---

## 🔧 Webhook Integration

### Configuring the Webhook

![OneChat API](https://i.imgur.com/dPUIemq.png)

The system allows you to configure a webhook URL and an API key through the interface. These inputs are essential for enabling real-time communication between your bot and external systems.

#### Input Form:
- **Webhook URL**: Enter the URL of your webhook endpoint.
- **Webhook ApiKey**: Enter the API key to secure communication with your webhook.

### JSON Payloads

#### Outgoing Request

When the bot sends a request to your webhook, it will include the following JSON payload:

```json
{
    "platform": "<platform>",
    "id": "<id>",
    "user": "<user>",
    "message": "<message>"
}
```

- `platform`: The platform the message originates from. Possible values are:
  - `whatsapp`
  - `discord`
  - `telegram`
- `id`: A unique identifier for the conversation or interaction.
- `user`: Information about the user (e.g., user ID or contact information).
- `message`: The content of the message to be processed.

#### Authentication Header

Every request includes an `Authorization` header for security:

```plaintext
Authorization: Bearer <webhook_key>
```

The `<webhook_key>` corresponds to the API key you provided during webhook configuration.

#### Expected Webhook Response

The webhook should return the following JSON payload:

```json
{
    "message": "Hello World!"
}
```

- `message`: The text the bot will send as a response to the user.

### Bot Behavior

Once the webhook responds with the `message` field, the bot will reply to the user with the specified text. For example:

1. If your webhook sends back:
    ```json
    {
        "message": "Hello World!"
    }
    ```

2. The bot replies to the user with:
    ```
    Hello World!
    ```

### Important Notes:
- Ensure that your webhook is capable of handling and responding to the outlined JSON structure.
- The `Authorization` header must be validated on your webhook server to ensure secure communication.
- The bot will not proceed with a response if the webhook fails to respond or returns an invalid format.

---
## 📄 API Documentation:

The complete API documentation can be found at `/api-docs` in your installation.

### Example API Routes:
1. **Create Instance**:
   ```bash
   curl -X POST http://localhost:3000/api/instances -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"udid": "unique-id-123"}'
   ```

2. **Get QR Data**:
   ```bash
   curl -X GET http://localhost:3000/api/instances/unique-id-123/qr -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **Delete Instance**:
   ```bash
   curl -X DELETE http://localhost:3000/api/instances/unique-id-123 -H "Authorization: Bearer YOUR_API_KEY"
   ```

4. **Update Webhook**:
   ```bash
   curl -X PATCH http://localhost:3000/api/instances/unique-id-123/webhook -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"webhook": "https://your-webhook-url.com", "webhook_key": "secure-key-1234"}'
   ```

5. **Disconnect Instance**:
   ```bash
   curl -X POST http://localhost:3000/api/instances/unique-id-123/disconnect -H "Authorization: Bearer YOUR_API_KEY"
   ```

6. **Send Message**:
   ```bash
   curl -X POST http://localhost:3000/api/instances/unique-id-123/send-message -H "Authorization: Bearer YOUR_API_KEY" -d '{"platform": "telegram", "recipient": "5492361899", "message": "Hello, this is a test message."}'
   ```


---

## 🌈 Features Overview

### 📊 Responsive Dashboard
Manage your instances visually through an elegant, responsive UI. 

### 🔐 Secure API
Your instance server is protected with API key validation to ensure unauthorized users can't access it.

### 📤 Webhook Integration
Receive real-time updates for messages and instance status using webhooks.

---

## 🌍 Environment Variables

Customize your deployment using the following environment variables:

| Variable               | Description                               | Default          |
|-------------------------|-------------------------------------------|------------------|
| `SERVER_URL`           | Base URL for the server                  | `http://localhost:3000` |
| `API_KEY`              | The API key for secure access            | `YOUR_API_KEY`     |
| `DB_CONNECTION_STRING` | Database connection string               | `postgresql://onechatuser:secret@db:5432/onechatdb` |
| `PROXY_HOST`           | Proxy hostname                           |                  |
| `PROXY_PORT`           | Proxy port                               |                  |
| `PROXY_PROTOCOL`       | Proxy protocol (e.g., http, https)       |                  |
| `PROXY_USERNAME`       | Proxy username                           |                  |
| `PROXY_PASSWORD`       | Proxy password                           |                  |
| `LOG_LEVEL`            | Logging level (e.g., warn, info)         | `warn`           |

---

## 🐳 Docker Image Available on GitHub Container Registry!

The official Docker image of OneChat API is now available on the GitHub Container Registry. 🚀

### Pull the image

You can pull the latest version of the OneChat API Docker image using the following command:

```bash
docker pull ghcr.io/1clickai/onechat-api:latest
```

### Run the container

To run the container, use:

```bash
docker run -d -p 3000:3000 --name onechat-api ghcr.io/1clickai/onechat-api:latest
```

Replace `3000:3000` with the appropriate port mapping for your setup.

Stay tuned for updates and improvements! 😊

---

## 🛠️ Contributing

We welcome contributions to **OneChat API**! Please fork the repository and submit a pull request. 🤝

---

## 🌟 About 1Click.AI

**1Click.AI** specializes in developing AI-driven solutions for businesses worldwide. Our mission is to create tools that streamline operations and boost productivity. **OneChat API** is just one of the many innovative solutions we offer. 

For more information, visit our website at [1Click.AI](https://1click.ai). 🌐

---

## ⚡ Support

If you encounter any issues, feel free to open an issue in this repository or contact us via email at `info@1click.ai`.
