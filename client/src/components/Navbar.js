import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, setUser }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';
    const isSeller = user?.role === 'seller' || isAdmin;

    return (
        <nav style={{
            padding: '10px 20px',
            backgroundColor: '#333',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                <Link to="/" style={{ color: 'white', marginRight: '15px', textDecoration: 'none' }}>Главная</Link>
                {user && (
                    <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>Товары</Link>
                )}
                {isAdmin && (
                    <Link to="/users" style={{ color: 'white', marginLeft: '15px', textDecoration: 'none' }}>Пользователи</Link>
                )}
            </div>
            <div>
                {user ? (
                    <>
                        <span style={{ marginRight: '15px' }}>
                            {user.first_name} ({user.role === 'admin' ? 'Админ' : user.role === 'seller' ? 'Продавец' : 'Пользователь'})
                        </span>
                        <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Выйти</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ color: 'white', marginRight: '15px', textDecoration: 'none' }}>Вход</Link>
                        <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>Регистрация</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;