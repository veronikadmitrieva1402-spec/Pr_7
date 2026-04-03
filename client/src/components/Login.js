import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

function Login({ setUser }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const successMessage = location.state?.message;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.login(formData);
            const { accessToken, refreshToken, user } = response.data;
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            setUser(user);
            navigate('/products');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Вход в систему</h2>
                {successMessage && <div style={styles.success}>{successMessage}</div>}
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Пароль"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Загрузка...' : 'Войти'}
                    </button>
                </form>
                <p style={{ marginTop: '15px' }}>
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
    },
    card: {
        padding: '30px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        width: '400px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    input: {
        width: '100%',
        padding: '10px',
        marginBottom: '15px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    error: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '15px',
    },
    success: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '15px',
    },
};

export default Login;