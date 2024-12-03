import React, { useEffect, useState } from 'react';

function QRCodeModal({ modalData, setModalData, apiKey, fetchInstances, handleNotification }) {
    const [qrCode, setQrCode] = useState('');

    useEffect(() => {
        const fetchQrCode = async () => {
            try {
                const response = await fetch(`/api/instances/${modalData.udid}/data`, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                const data = await response.json();

                if (data.status === 'connected') {
                    handleNotification('Instance connected successfully.', 'success');
                    setModalData(null);
                    fetchInstances();
                } else {
                    setQrCode(data.qr_code);
                }
            } catch (error) {
                handleNotification('Error fetching QR code.', 'error');
            }
        };

        fetchQrCode();
        const interval = setInterval(fetchQrCode, 5000);
        return () => clearInterval(interval);
    }, [modalData, apiKey, fetchInstances, handleNotification]);

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-body text-center" style={{
                        backgroundColor: '#1a1a1a',
                        color: '#fff'
                    }}>
                        <h5 className="mb-3">Scan the QR Code</h5>
                        <p className="mb-4">
                            Use <strong>WhatsApp</strong> or <strong>WhatsApp Business</strong> to scan this QR Code to connect your account.
                        </p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                                qrCode
                            )}`}
                            alt="QR Code"
                            className="img-fluid mb-3"
                        />
                        <button
                            className="btn btn-danger mt-0"
                            style={{ display: 'block', margin: '0 auto' }}
                            onClick={() => setModalData(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QRCodeModal;
