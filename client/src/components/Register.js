import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.register(formData);
            navigate('/login', { state: { message: 'Регистрация успешна! Войдите в систему.' } });
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Регистрация</h2>
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
                        type="text"
                        name="first_name"
                        placeholder="Имя"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                    <input
                        type="text"
                        name="last_name"
                        placeholder="Фамилия"
                        value={formData.last_name}
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
                        {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                    </button>
                </form>
                <p style={{ marginTop: '15px' }}>
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
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
        backgroundColor: '#28a745',
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
};

export default Register;