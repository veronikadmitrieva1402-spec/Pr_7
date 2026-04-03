import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import { authAPI } from './services/api';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                try {
                    const response = await authAPI.getMe();
                    setUser(response.data);
                } catch (err) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <BrowserRouter>
            <Navbar user={user} setUser={setUser} />
            <div className="container">
                <Routes>
                    <Route path="/login" element={
                        user ? <Navigate to="/products" /> : <Login setUser={setUser} />
                    } />
                    <Route path="/register" element={
                        user ? <Navigate to="/products" /> : <Register />
                    } />
                    <Route path="/products" element={
                        user ? <Products /> : <Navigate to="/login" />
                    } />
                    <Route path="/products/:id" element={
                        user ? <ProductDetail /> : <Navigate to="/login" />
                    } />
                    <Route path="/" element={
                        <Navigate to={user ? "/products" : "/login"} />
                    } />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;