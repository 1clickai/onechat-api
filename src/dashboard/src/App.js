import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import InstancesTable from './components/InstancesTable';
import QRCodeModal from './components/QRCodeModal';
import EditInstanceModal from './components/EditInstanceModal'; // Import do novo modal
import { ToastContainer, toast } from 'react-toastify';
import { FaTelegram, FaDiscord, FaTwitter, FaGlobe, FaEnvelope } from 'react-icons/fa'; // Importando os ícones
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
    const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
    const [instances, setInstances] = useState([]);
    const [modalData, setModalData] = useState(null);
    const [editModalData, setEditModalData] = useState(null); // Estado para o novo modal
    const [newInstance, setNewInstance] = useState(''); // Campo para o novo UDID

    const apiUrl = '/api/instances';
    const LOGO = '/logo.png';
    const [isLoading, setIsLoading] = useState(false);

    // Função para normalizar o texto
    const normalizeUdid = (value) => {
        return value
            .normalize('NFD') // Descompõe caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '') // Remove marcas diacríticas
            .replace(/[^a-zA-Z0-9]/g, '-') // Substitui caracteres especiais por '-'
            .replace(/-+/g, '-') // Substitui múltiplos '-' por um único
            .replace(/^-|-$/g, ''); // Remove '-' do início e fim
    };


    // Fetch instances from the API
    const fetchInstances = async () => {
        if (!apiKey) return;
        setIsLoading(true); // Inicia o estado de carregamento
        try {
            const response = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (response.status === 200) {
                let data = await response.json();

                const updatedData = await Promise.all(
                    data.map(async (instance) => {
                        if (instance.telegram_status === 'connected' && instance.telegram_api_key) {
                            try {
                                const telegramResponse = await fetch(
                                    `/api/instances/${instance.udid}/data`,
                                    {
                                        headers: { Authorization: `Bearer ${apiKey}` },
                                    }
                                );

                                if (telegramResponse.status === 200) {
                                    const telegramData = await telegramResponse.json();
                                    return {
                                        ...instance,
                                        tg_first_name: telegramData.tg_first_name,
                                        tg_username: telegramData.tg_username,
                                    };
                                }
                            } catch (error) {
                                console.error(
                                    `Error fetching Telegram data for instance ${instance.udid}:`,
                                    error
                                );
                            }
                        }
                        return instance;
                    })
                );

                setInstances(updatedData);
            } else {
                toast.error('Failed to fetch instances. Please log in again.');
                localStorage.removeItem('apiKey');
                setApiKey('');
            }
        } catch (error) {
            toast.error('Error fetching instances.');
            console.error('Error:', error);
        } finally {
            setIsLoading(false); // Encerra o estado de carregamento
        }
    };



    // Add a new instance
    const addInstance = async () => {
        // Normalizar apenas no momento de salvar
        const normalizedUdid = newInstance
            .trim() // Remove espaços no início e no fim
            .normalize('NFD') // Descompõe caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '') // Remove marcas diacríticas
            .replace(/[^a-zA-Z0-9]/g, '-') // Substitui caracteres especiais por '-'
            .replace(/-+/g, '-') // Substitui múltiplos '-' por um único
            .replace(/^-|-$/g, ''); // Remove '-' do início e fim

        if (!normalizedUdid) {
            toast.info('Please enter a valid UDID.');
            return;
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ udid: normalizedUdid }),
            });

            if (response.status === 201) {
                toast.success('Instance created successfully.');
                setNewInstance(''); // Limpa o campo de entrada
                fetchInstances(); // Atualiza a lista de instâncias
            } else {
                toast.error('Failed to create instance.');
            }
        } catch (error) {
            toast.error('Error creating instance.');
        }
    };


    // Logout function
    const handleLogout = () => {
        localStorage.removeItem('apiKey');
        setApiKey('');
    };

    useEffect(() => {
        if (apiKey) fetchInstances();
    }, [apiKey]);

    return (
        <div className="container my-5" style={{
            maxWidth: '1200px', // Substitua por sua largura desejada
            margin: '0 auto', // Centraliza horizontalmente
            width: '100%', // Garante largura responsiva
        }}>
            <ToastContainer /> {/* Renderizador de notificações */}
            <div className="d-flex flex-column align-items-center">
                <img
                    src={LOGO}
                    alt="Logo"
                    className="img-fluid mb-4"
                    style={{ maxWidth: '400px', height: 'auto' }}
                />
            </div>
            {!apiKey ? (
                <>
                    <LoginForm setApiKey={setApiKey} handleNotification={toast} />
                </>
            ) : (
                <>
                    {isLoading ? (
                        <div className="text-center my-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p>Loading instances...</p>
                        </div>
                    ) : (
                        <>
                            <div className="card bg-dark text-white shadow-lg mb-4">
                                <div className="card-body">
                                    <h4 className="card-title text-center mb-3">Create New Instance</h4>
                                    <div className="mb-3 d-flex align-items-center">
                                        <input
                                            type="text"
                                            className="form-control me-2"
                                            placeholder="Enter instance name"
                                            value={newInstance}
                                            onChange={(e) => setNewInstance(e.target.value)} // Sem normalização
                                        />

                                        <button
                                            className="btn btn-success"
                                            style={{ width: "auto", whiteSpace: "nowrap" }}
                                            onClick={addInstance}
                                        >
                                            Add Instance
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <InstancesTable
                                apiKey={apiKey}
                                instances={instances}
                                setInstances={setInstances}
                                setModalData={setModalData}
                                setEditModalData={setEditModalData}
                                fetchInstances={fetchInstances}
                                handleNotification={toast}
                            />
                        </>
                    )}

                    <div className="d-flex gap-2 mt-4">
                        <button
                            className="btn btn-primary w-50"
                            onClick={() => window.open('/api-docs', '_blank')}
                        >
                            API Doc
                        </button>
                        <button
                            className="btn btn-danger w-50"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </>
            )}
            {modalData && (
                <QRCodeModal
                    modalData={modalData}
                    setModalData={setModalData}
                    apiKey={apiKey}
                    fetchInstances={fetchInstances}
                    handleNotification={toast}
                />
            )}
            {editModalData && (
                <EditInstanceModal
                    show={!!editModalData}
                    handleClose={() => setEditModalData(null)} // Fecha o modal
                    instance={editModalData}
                    apiKey={apiKey}
                    fetchInstances={fetchInstances}
                    handleNotification={toast}
                />
            )}
            {/* Rodapé */}
            <footer className="mt-5 py-3 text-center" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="d-flex justify-content-center gap-3 mb-2">
                    <a href="#" className="text-dark" title="Telegram">
                        <FaTelegram style={{ color: '#6d6f71' }} size={24} />
                    </a>
                    <a href="#" className="text-dark" title="Discord">
                        <FaDiscord style={{ color: '#6d6f71' }} size={24} />
                    </a>
                    <a href="https://twitter.com/1ClickAI" target="_blank" rel="noopener noreferrer" className="text-dark">
                        <FaTwitter style={{ color: '#6d6f71' }} size={24} />
                    </a>
                    <a href="https://www.1click.ai" target="_blank" rel="noopener noreferrer" className="text-dark">
                        <FaGlobe style={{ color: '#6d6f71' }} size={24} />
                    </a>
                    <a href="mailto:info@1click.ai" className="text-dark">
                        <FaEnvelope style={{ color: '#6d6f71' }} size={24} />
                    </a>
                </div>
                <p className="mb-0 mt-3" style={{ fontSize: '0.9rem' }}>
                    © {new Date().getFullYear()} 1Click.AI All rights reserved.
                </p>
            </footer>
        </div>
    );
}

export default App;
