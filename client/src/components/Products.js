import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';

function Products({ userRole }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newProduct, setNewProduct] = useState({
        title: '',
        category: '',
        description: '',
        price: ''
    });

    const canCreate = userRole === 'seller' || userRole === 'admin';
    const canEdit = userRole === 'seller' || userRole === 'admin';
    const canDelete = userRole === 'admin';

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getAll();
            setProducts(response.data);
        } catch (err) {
            setError('Ошибка загрузки товаров');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await productsAPI.create({
                title: newProduct.title,
                category: newProduct.category,
                description: newProduct.description,
                price: parseFloat(newProduct.price)
            });
            setNewProduct({ title: '', category: '', description: '', price: '' });
            setShowForm(false);
            fetchProducts();
        } catch (err) {
            setError('Ошибка создания товара');
        }
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            alert('Только администратор может удалять товары');
            return;
        }
        if (window.confirm('Удалить товар?')) {
            try {
                await productsAPI.delete(id);
                fetchProducts();
            } catch (err) {
                setError('Ошибка удаления товара');
            }
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>Товары</h1>
                {canCreate && (
                    <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>
                        {showForm ? 'Отмена' : '+ Добавить товар'}
                    </button>
                )}
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {showForm && canCreate && (
                <form onSubmit={handleCreate} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Название"
                        value={newProduct.title}
                        onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="Категория"
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <textarea
                        placeholder="Описание"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        required
                        style={styles.textarea}
                    />
                    <input
                        type="number"
                        placeholder="Цена"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.submitButton}>Создать</button>
                </form>
            )}

            <div style={styles.grid}>
                {products.length === 0 ? (
                    <p>Нет товаров. Добавьте первый!</p>
                ) : (
                    products.map((product) => (
                        <div key={product.id} style={styles.card}>
                            <h3>{product.title}</h3>
                            <p style={styles.category}>{product.category}</p>
                            <p>{product.description}</p>
                            <p style={styles.price}>{product.price} ₽</p>
                            <div style={styles.cardButtons}>
                                <Link to={`/products/${product.id}`} style={styles.viewLink}>
                                    Подробнее
                                </Link>
                                {canDelete && (
                                    <button onClick={() => handleDelete(product.id)} style={styles.deleteButton}>
                                        Удалить
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    addButton: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    form: { marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', minHeight: '80px' },
    submitButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    category: { color: '#666', fontSize: '14px' },
    price: { fontSize: '20px', fontWeight: 'bold', color: '#28a745' },
    cardButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' },
    viewLink: { color: '#007bff', textDecoration: 'none' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' },
    error: { backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px' }
};

export default Products;