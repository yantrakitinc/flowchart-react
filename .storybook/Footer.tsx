import React from 'react';

export function Footer() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40px',
        backgroundColor: '#18181b',
        borderTop: '1px solid #3f3f46',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#a1a1aa',
        zIndex: 9999,
      }}
    >
      <span>Part of</span>
      <a
        href="https://yantrakit.com"
        style={{
          color: '#10b981',
          textDecoration: 'none',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        Yantrakit
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
