import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faCircleCheck, faCircleXmark, faUnlink, faQrcode, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip'; // Importa o componente Tooltip

import './InstancesTable.css';

function InstancesTable({
    apiKey,
    instances,
    setInstances,
    setModalData,
    setEditModalData, // Novo estado para o modal de edição
    fetchInstances,
    handleNotification,
}) {

    const deleteInstance = async (udid) => {
        const userConfirmed = window.confirm("Are you sure you want to delete this instance?");
        if (!userConfirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/instances/${udid}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (response.status === 200) {
                handleNotification('Instance deleted successfully.', 'success');
                fetchInstances();
            } else {
                handleNotification('Failed to delete instance.', 'error');
            }
        } catch (error) {
            handleNotification('Error deleting instance.', 'error');
        }
    };

    const disconnectInstance = async (udid) => {
        try {
            const response = await fetch(`/api/instances/${udid}/disconnect`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (response.status === 200) {
                handleNotification('Instance disconnected successfully.', 'success');
                fetchInstances();
            } else {
                handleNotification('Failed to disconnect instance.', 'error');
            }
        } catch (error) {
            handleNotification('Error disconnecting instance.', 'error');
        }
    };

    return (
        <div className="responsive-table">
            {instances.length > 0 ? (
                <table className="table table-striped table-dark text-center d-none d-md-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Instance</th>
                            <th style={{ width: '15%' }}>
                                <img
                                    src="/whatsapp.png"
                                    alt="WhatsApp"
                                    style={{ width: '20px', height: '20px' }} // Ajuste o tamanho conforme necessário
                                />
                            </th>
                            <th style={{ width: '15%' }}>
                                <img
                                    src="/telegram.png"
                                    alt="Telegram"
                                    style={{ width: '20px', height: '20px' }} // Ajuste o tamanho conforme necessário
                                />
                            </th>
                            <th style={{ width: '15%' }}>
                                <img
                                    src="/discord.png"
                                    alt="Discord"
                                    style={{ width: '20px', height: '20px' }} // Ajuste o tamanho conforme necessário
                                />
                            </th>
                            <th style={{ width: '20%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instances.map((instance) => (
                            <tr key={instance.udid}>
                                <td style={{ textAlign: 'center', fontSize: '14px' }}>{instance.udid}</td>
                                <td style={{ textAlign: 'center', fontSize: '14px' }}>
                                    {instance.phone_number ? (
                                        <>
                                            <a
                                                href={`https://wa.me/${instance.phone_number}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {instance.phone_number}
                                            </a>
                                            <br />
                                        </>
                                    ) : (
                                        <>{`-`}<br /></>
                                    )}
                                    {instance.status === 'connected' ? (
                                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#28a745' }} />
                                    ) : (
                                        <FontAwesomeIcon icon={faCircleXmark} style={{ color: 'red' }} />
                                    )}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '14px' }}>
                                    {instance.tg_username ? (
                                        <>
                                            <a
                                                href={`https://t.me/${instance.tg_username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                @{instance.tg_username}
                                            </a>
                                            <br />
                                        </>
                                    ) : (
                                        <>{`-`}<br /></>
                                    )}
                                    {instance.telegram_status === 'connected' ? (
                                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#28a745' }} />
                                    ) : (
                                        <FontAwesomeIcon icon={faCircleXmark} style={{ color: 'red' }} />
                                    )}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '14px' }}>
                                    {instance.discord_bot_name ? (
                                        <>
                                            <span>
                                                {instance.discord_status === 'connected' ? (
                                                    <>
                                                        <a
                                                            href="#"
                                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                                        >
                                                            {instance.discord_bot_name}
                                                        </a>
                                                        <br />
                                                    </>
                                                ) : (
                                                    <>{`N/A`}<br /></>
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <>{`-`}<br /></>
                                    )}
                                    {instance.discord_status === 'connected' ? (
                                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#28a745' }} />
                                    ) : (
                                        <FontAwesomeIcon icon={faCircleXmark} style={{ color: 'red' }} />
                                    )}
                                </td>
                                <td>
                                    {instance.status === 'connected' ? (
                                        <button
                                            className="btn btn-warning me-2"
                                            onClick={() => disconnectInstance(instance.udid)}
                                            data-tooltip-id="tooltip-disconnect"
                                            data-tooltip-content="Disconnect WhatsApp"
                                        >
                                            <FontAwesomeIcon icon={faUnlink} />
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-primary me-2"
                                            onClick={() => setModalData(instance)}
                                            data-tooltip-id="tooltip-connect"
                                            data-tooltip-content="Connect WhatsApp"
                                        >
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary me-2"
                                        onClick={() => setEditModalData(instance)}
                                        data-tooltip-id="tooltip-edit"
                                        data-tooltip-content="Edit Api Keys"
                                    >
                                        <FontAwesomeIcon icon={faKey} />
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => deleteInstance(instance.udid)}
                                        data-tooltip-id="tooltip-delete"
                                        data-tooltip-content="Delete Instance"
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                    {/* Definição dos tooltips */}
                                    <Tooltip id="tooltip-disconnect" />
                                    <Tooltip id="tooltip-connect" />
                                    <Tooltip id="tooltip-edit" />
                                    <Tooltip id="tooltip-delete" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center">No instances available.</p>
            )}
            <div className="responsive-cards d-md-none">
                {instances.map((instance) => (
                    <div className="card mb-3" key={instance.udid}>
                        <div className="card-body">
                            <p>
                                <strong>Name:</strong> {instance.udid}
                            </p>
                            <p>
                                <strong>Phone Number:</strong> {instance.phone_number || 'N/A'}
                            </p>
                            <p>
                                <strong>WhatsApp:</strong> {instance.status === 'connected' ? 'Connected' : 'Disconnected'}
                            </p>
                            <p>
                                <strong>Telegram:</strong> {instance.telegram_status === 'connected' ? 'Connected' : 'Disconnected'}
                            </p>
                            <p>
                                <strong>Discord:</strong> {instance.discord_status === 'connected' ? 'Connected' : 'Disconnected'}
                            </p>
                            <div>
                                <button
                                    className="btn btn-secondary me-2"
                                    onClick={() => setEditModalData(instance)}
                                >
                                    <FontAwesomeIcon icon={faKey} />
                                </button>
                                {instance.status === 'connected' ? (
                                    <button
                                        className="btn btn-warning"
                                        onClick={() => disconnectInstance(instance.udid)}
                                    >
                                        <FontAwesomeIcon icon={faUnlink} />
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setModalData(instance)}
                                    >
                                        <FontAwesomeIcon icon={faQrcode} />
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => deleteInstance(instance.udid)}
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default InstancesTable;
