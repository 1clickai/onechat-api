import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import './EditInstanceModal.css'; // Adicione um arquivo CSS separado para estilização

function EditInstanceModal({ show, handleClose, instance, apiKey, fetchInstances, handleNotification }) {
    const [formData, setFormData] = useState({
        webhook: instance?.webhook || '',
        webhook_key: instance?.webhook_key || '',
        telegram_api_key: instance?.telegram_api_key || '',
        discord_bot_token: instance?.discord_bot_token || '', // Adicionando o campo do Discord
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`/api/instances/${instance.udid}/webhook`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.status === 200) {
                handleNotification('Instance updated successfully.', 'success');
                fetchInstances();
                handleClose();
            } else {
                handleNotification('Failed to update instance.', 'error');
            }
        } catch (error) {
            handleNotification('Error updating instance.', 'error');
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Body>
                <form onSubmit={handleSubmit} className="edit-instance-form">
                    <div className="form-group">
                        <label className="form-label">Webhook URL</label>
                        <input
                            type="text"
                            className="form-control"
                            name="webhook"
                            value={formData.webhook}
                            onChange={handleChange}
                            placeholder="Enter webhook URL"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Webhook ApiKey</label>
                        <input
                            type="text"
                            className="form-control"
                            name="webhook_key"
                            value={formData.webhook_key}
                            onChange={handleChange}
                            placeholder="Enter webhook key"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Telegram Bot ApiKey (Delete to disconnect)</label>
                        <input
                            type="text"
                            className="form-control"
                            name="telegram_api_key"
                            value={formData.telegram_api_key}
                            onChange={handleChange}
                            placeholder="Enter Telegram API key"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Discord Bot Token (Delete to disconnect)</label>
                        <input
                            type="text"
                            className="form-control"
                            name="discord_bot_token"
                            value={formData.discord_bot_token}
                            onChange={handleChange}
                            placeholder="Enter Discord Bot Token"
                        />
                    </div>
                    <div className="d-flex justify-content-between mt-3">
                        <Button type="submit" variant="success">
                            Update
                        </Button>
                        <Button variant="danger" onClick={handleClose}>
                            Close
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}

export default EditInstanceModal;
