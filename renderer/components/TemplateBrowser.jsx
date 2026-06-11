import React, { useState, useEffect, useCallback } from 'react';

const CATEGORIES = ['all', 'review', 'refactor', 'testing', 'security', 'debug', 'general'];

export default function TemplateBrowser({ onLoadTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = category !== 'all' ? `?category=${category}` : '';
      const res = await fetch(`/api/templates${params}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleLoad = () => {
    if (selected && onLoadTemplate) {
      onLoadTemplate(selected);
    }
  };

  return (
    <div className="template-browser">
      <div className="template-browser-header">
        <h3>Templates</h3>
        <div className="template-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="template-list">
        {loading && <div className="template-loading">Loading...</div>}
        {!loading && templates.length === 0 && <div className="template-empty">No templates found</div>}
        {templates.map(tpl => (
          <div
            key={tpl.name}
            className={`template-item ${selected?.name === tpl.name ? 'selected' : ''}`}
            onClick={() => setSelected(tpl)}
          >
            <div className="template-item-name">{tpl.name}</div>
            <div className="template-item-desc">{tpl.description}</div>
            <div className="template-item-meta">
              <span className="template-category-badge">{tpl.category}</span>
              {tpl.steps > 0 && <span className="template-steps">{tpl.steps} steps</span>}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="template-actions">
          <button className="btn-primary" onClick={handleLoad}>Load Template</button>
          <button className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
