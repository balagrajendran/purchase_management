const prodBase = '/api';
const devBase  = 'http://localhost:8080/api';

const envBase = (import.meta as any).env?.VITE_API_BASE;
export const API_BASE =
  envBase ??
  (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? devBase : prodBase);

console.log('MODE:', (import.meta as any).env.MODE, 'API_BASE:', API_BASE);
