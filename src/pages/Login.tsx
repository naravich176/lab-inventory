import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';

const Login: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server URL settings
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());

  const handleSubmit = async (e?: React.FormEvent) => {
    // ป้องกัน form submit ที่ทำให้ browser navigate
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Attempting login for:', username.trim());
      const result = await login(username.trim(), password);
      console.log('[Login] Success:', result);
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleServerUrlSave = () => {
    if (serverUrl.trim()) {
      api.setBaseUrl(serverUrl.trim());
      setShowServerSettings(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-slate-100"
      style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <img src="/pngtree-green-lab-logo-png-image_5969669.png" alt="Lab Stock" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ระบบจัดการคลังแล็บ</h1>
          <p className="text-sm text-slate-500 mt-1">Lab Stock</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">เข้าสู่ระบบ</h2>
            <p className="text-sm text-slate-500 mb-6">กรอกข้อมูลเพื่อเข้าใช้งานระบบ</p>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(null); }}
                    placeholder="ระบุชื่อผู้ใช้"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all"
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    lock
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                    placeholder="ระบุรหัสผ่าน"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading}
                className="w-full py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">login</span>
                    เข้าสู่ระบบ
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Server Settings */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => setShowServerSettings(!showServerSettings)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              ตั้งค่า Server
              <span className="material-symbols-outlined text-sm">
                {showServerSettings ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showServerSettings && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-slate-500">Server URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                  />
                  <button
                    onClick={handleServerUrlSave}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    บันทึก
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  ที่อยู่ API Server ปัจจุบัน: {api.getBaseUrl()}
                </p>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default Login;