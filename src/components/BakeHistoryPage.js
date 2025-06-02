import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function BakeHistoryPage() {
  const { token } = useAuth();
  console.log("BakeHistoryPage rendered, token:", token);
  const [bakes, setBakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('You are not logged in.');
      setLoading(false);
      return;
    }
    async function fetchHistory() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('http://localhost:3001/api/bakes/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch bake history.');
        const data = await res.json();
        setBakes(data.bakes || []);
      } catch (err) {
        setError(err.message || 'An error occurred.');
      }
      setLoading(false);
    }
    fetchHistory();
  }, [token]);

  let completed = bakes.filter(b => b.status === 'completed');
  let abandoned = bakes.filter(b => b.status === 'abandoned');

  const sortFn = sortBy === 'name'
    ? (a, b) => (a.recipe_name || '').localeCompare(b.recipe_name || '')
    : (a, b) => new Date(b.bake_start_timestamp) - new Date(a.bake_start_timestamp);

  completed = [...completed].sort(sortFn);
  abandoned = [...abandoned].sort(sortFn);

  return (
    <div className="bake-history-container">
      <h2>Bake History</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Sort by:{' '}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date">Date (Newest First)</option>
            <option value="name">Recipe Name (A-Z)</option>
          </select>
        </label>
      </div>
      {loading ? (
        <div className="feedback-message feedback-message-info" style={{ textAlign: 'center' }}>
          <span className="buttonSpinner" style={{ marginRight: 8 }} /> Loading...
        </div>
      ) : error ? (
        <div className="feedback-message feedback-message-error">{error}</div>
      ) : (
        <div className="bake-history-lists">
          <section className="bake-history-section">
            <h3>Completed Bakes</h3>
            {completed.length === 0 ? (
              <p className="feedback-message feedback-message-info">No completed bakes yet.</p>
            ) : (
              <ul className="bake-history-list">
                {completed.map(bake => (
                  <li
                    key={bake.bake_log_id}
                    className="bake-history-list-item"
                    onClick={() => navigate(`/bake-history/${bake.bake_log_id}`)}
                    style={{
                      cursor: 'pointer',
                      marginBottom: 12,
                      background: 'var(--color-secondary)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'var(--color-secondary)')}
                  >
                    <strong>{bake.recipe_name || 'Untitled Recipe'}</strong>
                    <div style={{ fontSize: '0.95em', color: 'var(--color-text-muted)' }}>
                      {new Date(bake.bake_start_timestamp).toLocaleString()} – {bake.bake_end_timestamp ? new Date(bake.bake_end_timestamp).toLocaleString() : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.95em', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {bake.user_overall_notes?.slice(0, 100)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bake-history-section" style={{ marginTop: 32 }}>
            <h3>Abandoned Bakes</h3>
            {abandoned.length === 0 ? (
              <p className="feedback-message feedback-message-info">No abandoned bakes.</p>
            ) : (
              <ul className="bake-history-list">
                {abandoned.map(bake => (
                  <li
                    key={bake.bake_log_id}
                    className="bake-history-list-item"
                    onClick={() => navigate(`/bake-history/${bake.bake_log_id}`)}
                    style={{
                      cursor: 'pointer',
                      marginBottom: 12,
                      background: 'var(--color-secondary)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'var(--color-secondary)')}
                  >
                    <strong>{bake.recipe_name || 'Untitled Recipe'}</strong>
                    <div style={{ fontSize: '0.95em', color: 'var(--color-text-muted)' }}>
                      {new Date(bake.bake_start_timestamp).toLocaleString()} – {bake.bake_end_timestamp ? new Date(bake.bake_end_timestamp).toLocaleString() : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.95em', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {bake.user_overall_notes?.slice(0, 100)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default BakeHistoryPage;