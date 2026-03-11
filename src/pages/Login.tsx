import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import api, { adminApi } from '@/lib/axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (isAdminLogin) {
        response = await adminApi.post('/login', { email, password });
      } else {
        response = await api.post('/auth/staff/login', { email, password });
      }
      const token = response.data.token;
      login(token);
      toast.success('Login successful');
      const { jwtDecode } = await import('jwt-decode');
      const decoded = jwtDecode<{ role: string }>(token);
      navigate(decoded.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const features = ['Appointment Management', 'Report Upload & Tracking', 'Staff Management', 'Multi-Center Support'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lg-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #f8fafc;
        }

        /* ── LEFT PANEL ── 50% equal width */
        .lg-left {
          display: none;
          flex: 1;
          width: 50%;
          position: relative;
          overflow: hidden;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 1024px) { .lg-left { display: flex; } }

        /* Background image — /public/doctor-group.jpg */
        .lg-left-bg {
          position: absolute;
          inset: 0;
          background-image: url('/doctor-group.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
        }

        /* Dark gradient overlay */
        .lg-left-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(150deg,
    rgba(10, 20, 55, 0.72) 0%,
    rgba(15, 35, 80, 0.65) 45%,
    rgba(20, 50, 100, 0.60) 100%
  );
  z-index: 1;
}

        /* Bubbles */
        .lg-blob {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          pointer-events: none;
          z-index: 2;
        }
        .lg-blob-1 { width: 380px; height: 380px; top: -100px; right: -100px; }
        .lg-blob-2 { width: 240px; height: 240px; bottom: 80px; left: -70px; }
        .lg-blob-3 { width: 120px; height: 120px; top: 45%; right: 60px; }

        /* Centered content wrapper */
        .lg-left-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 36px;
          padding: 48px 40px;
          max-width: 480px;
          width: 100%;
        }

        /* Logo */
        .lg-left-logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lg-logo-img {
          height: 64px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 12px rgba(0,0,0,0.4));
        }

        /* Hero text */
        .lg-left-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lg-left-hero h2 {
          font-size: 34px;
          font-weight: 800;
          color: #fff;
          line-height: 1.18;
          letter-spacing: -0.8px;
        }
        .lg-left-hero p {
          font-size: 14.5px;
          color: rgba(255,255,255,0.62);
          line-height: 1.65;
          max-width: 300px;
        }

        /* Features */
        .lg-features {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          max-width: 280px;
        }
        .lg-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
        }
        .lg-feature-icon {
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          color: #a5b4fc; flex-shrink: 0;
        }

        /* ── RIGHT PANEL ── 50% equal width */
        .lg-right {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        @media (min-width: 1024px) {
          .lg-right {
            flex: 1;
            width: 50%;
          }
        }

        .lg-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 20px;
          padding: 36px 32px 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08);
          border: 1px solid #e8edf2;
        }
        @media (max-width: 480px) { .lg-card { padding: 28px 18px 22px; border-radius: 16px; } }

        /* Mobile-only logo — centered */
        /* Mobile logo */
.lg-mobile-logo{
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}

/* Desktop par hide */
@media (min-width: 1024px){
  .lg-mobile-logo{
    display: none;
  }
}

.lg-mobile-logo-img{
  width: 120px;
  height: auto;
}

        .lg-heading { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px; }
        .lg-subheading { font-size: 13.5px; color: #64748b; margin-bottom: 24px; }

        /* Tabs */
        .lg-tabs {
          display: flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 16px;
          position: relative;
        }
        .lg-tab-slider {
          position: absolute;
          top: 3px; bottom: 3px;
          width: calc(50% - 3px);
          left: 3px;
          background: #fff;
          border-radius: 7px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .lg-tab-slider.right { transform: translateX(100%); }
        .lg-tab {
          flex: 1; padding: 9px 12px;
          font-size: 13px; font-weight: 600;
          color: #64748b; border: none; background: transparent;
          cursor: pointer; border-radius: 8px;
          position: relative; z-index: 1;
          transition: color 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .lg-tab.active { color: #1e3a8a; }

        .lg-role-hint {
          font-size: 12px; color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 22px;
        }

        /* Fields */
        .lg-field { margin-bottom: 16px; }
        .lg-label {
          display: block;
          font-size: 11.5px; font-weight: 700;
          color: #374151;
          text-transform: uppercase; letter-spacing: 0.6px;
          margin-bottom: 6px;
        }
        .lg-input-wrap { position: relative; }
        .lg-input {
          width: 100%; height: 44px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #fafafa;
          font-size: 14px; color: #0f172a;
          padding: 0 42px 0 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
          -webkit-appearance: none;
        }
        .lg-input::placeholder { color: #94a3b8; }
        .lg-input:focus {
          border-color: #4f46e5;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
        }
        .lg-eye {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8; background: none; border: none;
          cursor: pointer; display: flex; align-items: center;
          transition: color 0.15s; padding: 0;
        }
        .lg-eye:hover { color: #475569; }

        /* Default (Laptop/Desktop) */
.lg-mobile-logo{
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

/* Mobile view */
@media (max-width: 768px){
  .lg-mobile-logo{
    justify-content: center;
  }
}

.lg-mobile-logo-img{
  width: 120px;
  height: auto;
}

        /* Error */
        .lg-error {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 13px; color: #dc2626;
          margin-bottom: 16px;
        }
        .lg-err-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }

        /* Button */
        .lg-btn {
          width: 100%; height: 46px; border-radius: 11px;
          background: linear-gradient(135deg, #1e3a8a 0%, #4f46e5 60%, #6d28d9 100%);
          color: #fff; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.1px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(79,70,229,0.3);
        }
        .lg-btn:hover:not(:disabled) {
          opacity: 0.93; transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(79,70,229,0.38);
        }
        .lg-btn:active:not(:disabled) { transform: translateY(0); }
        .lg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lg-arrow { transition: transform 0.2s; font-size: 16px; }
        .lg-btn:hover:not(:disabled) .lg-arrow { transform: translateX(4px); }
        @keyframes lg-spin { to { transform: rotate(360deg); } }
        .lg-spin { animation: lg-spin 0.8s linear infinite; }

        .lg-footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; }
      `}</style>

      <div className="lg-root">

        <div className="lg-left">
          <div className="lg-left-bg" />
          <div className="lg-left-overlay" />

          <div className="lg-blob lg-blob-1" />
          <div className="lg-blob lg-blob-2" />
          <div className="lg-blob lg-blob-3" />

          <div className="lg-left-content">
            <div className="lg-left-logo">
            </div>
            <div className="lg-left-hero">
              <h2>Run your diagnostic<br /><span>centers smarter</span></h2>
            </div>

            <div className="lg-features">
              {features.map(f => (
                <div key={f} className="lg-feature-item">
                  <div className="lg-feature-icon"><CheckCircle size={12} /></div>
                  {f}
                </div>
              ))}
            </div>

          </div>
        </div>
        <div className="lg-right">
          <div className="lg-card">
            <div className="lg-mobile-logo">
              <img src="/logo.png" alt="DiagnosticMS" className="lg-mobile-logo-img" />
            </div>

            <h1 className="lg-heading">Welcome back 👋</h1>
            <p className="lg-subheading">Sign in to your portal to continue</p>

            <div className="lg-tabs">
              <div className={`lg-tab-slider ${isAdminLogin ? 'right' : ''}`} />
              <button className={`lg-tab ${!isAdminLogin ? 'active' : ''}`} onClick={() => { setIsAdminLogin(false); setError(''); }}>Staff Login</button>
              <button className={`lg-tab ${isAdminLogin ? 'active' : ''}`} onClick={() => { setIsAdminLogin(true); setError(''); }}>Admin Login</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="lg-field">
                <label className="lg-label">Email Address</label>
                <div className="lg-input-wrap">
                  <input className="lg-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                </div>
              </div>
              <div className="lg-field">
                <label className="lg-label">Password</label>
                <div className="lg-input-wrap">
                  <input className="lg-input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
                  <button type="button" className="lg-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lg-error">
                  <span className="lg-err-dot" />
                  {error}
                </div>
              )}

              <button type="submit" className="lg-btn" disabled={loading}>
                {loading
                  ? <><Loader2 size={15} className="lg-spin" /> Signing in...</>
                  : <>Sign in <span className="lg-arrow">→</span></>}
              </button>
            </form>
          </div>
        </div>

      </div>
    </>
  );
};

export default Login;