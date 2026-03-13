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
      <a
        href="https://www.npmjs.com/package/@yantrakit/flowchart-react"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#cb3837',
          textDecoration: 'none',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        npm
      </a>
      <span style={{ color: '#52525b' }}>•</span>
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
      </a>
    </div>
  );
}
