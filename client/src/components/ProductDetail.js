import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getById(id);
            setProduct(response.data);
            setEditData(response.data);
        } catch (err) {
            setError('Товар не найден');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await productsAPI.update(id, {
                title: editData.title,
                category: editData.category,
                description: editData.description,
                price: parseFloat(editData.price)
            });
            setIsEditing(false);
            fetchProduct();
        } catch (err) {
            setError('Ошибка обновления');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Удалить товар?')) {
            try {
                await productsAPI.delete(id);
                navigate('/products');
            } catch (err) {
                setError('Ошибка удаления');
            }
        }
    };

    if (loading) return <div style={styles.center}>Загрузка...</div>;
    if (error) return <div style={styles.center}>{error}</div>;
    if (!product) return null;

    return (
        <div style={styles.container}>
            <button onClick={() => navigate('/products')} style={styles.backButton}>
                ← Назад
            </button>

            {isEditing ? (
                <form onSubmit={handleUpdate} style={styles.form}>
                    <h2>Редактирование товара</h2>
                    <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <input
                        type="text"
                        value={editData.category}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        required
                        style={styles.textarea}
                    />
                    <input
                        type="number"
                        value={editData.price}
                        onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                        required
                        style={styles.input}
                    />
                    <div style={styles.formButtons}>
                        <button type="submit" style={styles.saveButton}>Сохранить</button>
                        <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelButton}>
                            Отмена
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <h1>{product.title}</h1>
                    <p style={styles.category}>Категория: {product.category}</p>
                    <p style={styles.description}>{product.description}</p>
                    <p style={styles.price}>{product.price} ₽</p>
                    <div style={styles.buttons}>
                        <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                            Редактировать
                        </button>
                        <button onClick={handleDelete} style={styles.deleteButton}>
                            Удалить
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    category: {
        color: '#666',
        fontSize: '16px',
    },
    description: {
        margin: '20px 0',
        lineHeight: '1.5',
    },
    price: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#28a745',
    },
    buttons: {
        marginTop: '30px',
        display: 'flex',
        gap: '10px',
    },
    editButton: {
        padding: '10px 20px',
        backgroundColor: '#ffc107',
        color: '#333',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    deleteButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    form: {
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
    },
    input: {
        width: '100%',
        padding: '10px',
        marginBottom: '15px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        marginBottom: '15px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        minHeight: '100px',
    },
    formButtons: {
        display: 'flex',
        gap: '10px',
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    center: {
        textAlign: 'center',
        marginTop: '50px',
    },
};

export default ProductDetail;