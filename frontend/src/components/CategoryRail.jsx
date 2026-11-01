import React from 'react';
export default function CategoryRail({ categories, active, onChange, loading }) {
  return <div className="category-rail" id="trending"><button className={active === 'all' ? 'cat active' : 'cat'} onClick={() => onChange('all')}><span>✦</span>All</button>{loading ? <span className="muted">Loading categories…</span> : categories.map(category => <button key={category.id || category._id} className={active === category.slug ? 'cat active' : 'cat'} onClick={() => onChange(category.slug)}><span>{category.icon}</span>{category.name}</button>)}</div>;
}
