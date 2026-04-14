import React, { useState, useEffect } from 'react';
import * as api from '../services/api';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createUser({ username, password, role });
      setUsername('');
      setPassword('');
      setRole('user');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleRemove = async (targetUsername) => {
    setError('');
    try {
      await api.deleteUser(targetUsername, currentUser);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="user-mgmt">
      <h4 className="user-mgmt-title">Users</h4>
      {error && <p className="sidebar-error">{error}</p>}
      <table className="user-mgmt-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.username}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
              <td>
                {u.username !== currentUser && (
                  <button
                    className="user-mgmt-remove-btn"
                    onClick={() => handleRemove(u.username)}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="user-mgmt-form" onSubmit={handleAdd}>
        <input
          className="user-mgmt-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="user-mgmt-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className="user-mgmt-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button className="user-mgmt-add-btn" type="submit">Add</button>
      </form>
    </div>
  );
}
