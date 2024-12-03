import React, { useState } from 'react';

function LoginForm({ setApiKey, handleNotification }) {
    const [inputKey, setInputKey] = useState('');

    const handleLogin = () => {
        if (!inputKey.trim()) {
            handleNotification('Please enter your API Key.', 'info');
            return;
        }
        setApiKey(inputKey.trim());
        localStorage.setItem('apiKey', inputKey.trim());
    };

    return (
        <div>
            <h1>Login</h1>
            <div className="mb-3">
                <input
                    type="password"
                    className="form-control"
                    placeholder="Enter your API Key"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                />
            </div>
            <div className="d-flex gap-2">
                <button onClick={handleLogin} className="btn btn-success w-50">
                    Login
                </button>
                <button
                    className="btn btn-info w-50"
                    onClick={() => window.open('/api-docs', '_blank')}
                >
                    API Doc
                </button>
            </div>
        </div>
    );
}

export default LoginForm;
