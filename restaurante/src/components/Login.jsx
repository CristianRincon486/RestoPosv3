// src/components/Login.jsx

import React, { useState } from 'react';
import { requireSupabase } from '../lib/supabaseClient';


function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [verPass, setVerPass] = useState(false);

  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const client = requireSupabase();
      // Para conservar el campo "Usuario", el administrador puede escribir
      // su correo de Supabase o el alias "admin".
      const identificador = usuario.trim();
      const email = identificador.includes('@')
        ? identificador
        : identificador.toLowerCase() === 'admin'
          ? 'admin@labahia.local'
          : `${identificador.toLowerCase()}@labahia.local`;
      const { data, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      const perfil = data.user?.user_metadata || {};
      onLogin({
        id: data.user.id,
        nombre: perfil.nombre || perfil.full_name || 'Administrador',
        usuario: perfil.usuario || identificador,
        email: data.user.email,
      });
    } catch (err) {
      console.error('Error de inicio de sesión:', err);
      setError(err.message?.includes('Falta configurar')
        ? err.message
        : 'Usuario o contraseña incorrectos. Verifica que el usuario exista en Supabase Auth.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1C1A17 0%, #2C1A0E 50%, #1C1A17 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'system-ui, sans-serif',
    }}>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 30% 50%, rgba(196,116,42,0.12) 0%, transparent 60%),
                     radial-gradient(ellipse at 70% 30%, rgba(196,116,42,0.08) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '400px',
      }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'rgba(196,116,42,0.15)',
            border: '2px solid rgba(196,116,42,0.4)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 16px',
          }}>🍽</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#C4742A', letterSpacing: '2px' }}>
            Restaurante La Bahía
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>
            Sistema de Gestión Empresarial
          </div>
        </div>

        <div style={{
          background: 'rgba(30,29,28,0.95)',
          border: '1px solid rgba(196,116,42,0.2)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>

          <div style={{ fontSize: '16px', fontWeight: 600, color: 'white', textAlign: 'center', marginBottom: '24px' }}>
            Iniciar sesión
          </div>

          <form onSubmit={handleLogin}>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Ej: admin"
                autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button type="button"
                  onClick={() => setVerPass(!verPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px',
                  }}>
                  {verPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(184,48,48,0.15)',
                border: '1px solid rgba(184,48,48,0.4)',
                borderRadius: '8px', padding: '10px 12px',
                fontSize: '12px', color: '#E05858',
                marginBottom: '16px',
              }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={cargando} style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #C4742A, #A85E1E)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s',
              letterSpacing: '0.3px',
            }}
              onMouseEnter={e => e.target.style.opacity = '0.88'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              {cargando ? 'Conectando...' : '→ Ingresar al sistema'}
            </button>

          </form>

          <div style={{ marginTop: '16px', color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'center' }}>Acceso administrado mediante Supabase Auth.</div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          RestoPOS · Restaurante La Bahía · Bogotá D.C.
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: 'white',
  fontSize: '14px', outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

export default Login;