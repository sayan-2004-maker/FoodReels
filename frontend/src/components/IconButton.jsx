import React from 'react';
export default function IconButton({ label, icon, count, active, onClick, title }) {
  return <button className={`icon-btn ${active?'active':''}`} onClick={onClick} title={title||label} aria-label={label}><span>{icon}</span>{count!==undefined&&<small>{count}</small>}</button>
}
