import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (err) {
            setError('Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await usersAPI.update(editingUser.id, {
                first_name: editingUser.first_name,
                last_name: editingUser.last_name,
                role: editingUser.role,
                isBlocked: editingUser.isBlocked
            });
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError('Ошибка обновления');
        }
    };

    const handleBlock = async (id, isBlocked) => {
        try {
            await usersAPI.update(id, { isBlocked: !isBlocked });
            fetchUsers();
        } catch (err) {
            setError('Ошибка блокировки');
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div style={styles.container}>
            <h1>Управление пользователями</h1>
            {error && <div style={styles.error}>{error}</div>}

            {editingUser && (
                <form onSubmit={handleUpdate} style={styles.form}>
                    <h3>Редактирование: {editingUser.email}</h3>
                    <input
                        type="text"
                        value={editingUser.first_name}
                        onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                        style={styles.input}
                    />
                    <input
                        type="text"
                        value={editingUser.last_name}
                        onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                        style={styles.input}
                    />
                    <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                        style={styles.input}
                    >
                        <option value="user">Пользователь</option>
                        <option value="seller">Продавец</option>
                        <option value="admin">Администратор</option>
                    </select>
                    <label style={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={editingUser.isBlocked}
                            onChange={(e) => setEditingUser({ ...editingUser, isBlocked: e.target.checked })}
                        />
                        Заблокирован
                    </label>
                    <div style={styles.formButtons}>
                        <button type="submit" style={styles.saveButton}>Сохранить</button>
                        <button type="button" onClick={() => setEditingUser(null)} style={styles.cancelButton}>Отмена</button>
                    </div>
                </form>
            )}

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Имя</th>
                        <th>Фамилия</th>
                        <th>Роль</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} style={user.isBlocked ? styles.blockedRow : {}}>
                            <td>{user.email}</td>
                            <td>{user.first_name}</td>
                            <td>{user.last_name}</td>
                            <td>{user.role}</td>
                            <td>{user.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                            <td>
                                <button onClick={() => setEditingUser(user)} style={styles.editButton}>
                                    Редактировать
                                </button>
                                <button onClick={() => handleBlock(user.id, user.isBlocked)} style={user.isBlocked ? styles.unblockButton : styles.blockButton}>
                                    {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const styles = {
    container: { padding: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    error: { backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px' },
    form: { padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    checkbox: { display: 'block', marginBottom: '10px' },
    formButtons: { display: 'flex', gap: '10px' },
    saveButton: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    editButton: { padding: '5px 10px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    blockButton: { padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    unblockButton: { padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    blockedRow: { backgroundColor: '#f8d7da', opacity: 0.7 }
};

export default Users;