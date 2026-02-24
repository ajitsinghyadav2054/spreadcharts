import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../features/auth/authSlice';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(loginUser({ username, password }));
    };

    return (
        <div className="flex min-h-screen bg-[#0e0e15] items-center justify-center p-4 font-sans text-gray-200">
            <div
                className="flex w-full max-w-lg bg-[#181824] rounded-[2rem] shadow-2xl flex-col relative border border-[#2a2a35] ring-1 ring-white/5"
                style={{ padding: '60px', minHeight: '650px', justifyContent: 'center' }}
            >

                <div className="w-full">
                    <h1 className="text-3xl font-bold text-white mb-2 text-center" style={{ marginTop: '20px' }}>Welcome Back!</h1>
                    <p className="text-gray-400 text-sm text-center" style={{ marginBottom: '50px' }}>Please Log in to your account.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 text-red-300 text-xs rounded border border-red-800/50 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 ml-1" style={{ marginBottom: '8px' }}>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 rounded-xl border border-[#2a2a35] bg-[#212130] text-gray-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-gray-500 text-sm"
                                style={{ padding: '12px 16px' }}
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 ml-1" style={{ marginBottom: '8px' }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 rounded-xl border border-[#2a2a35] bg-[#212130] text-gray-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-gray-500 text-sm"
                                style={{ padding: '12px 16px' }}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#1e5c5b] hover:bg-[#164847] text-white rounded-xl font-medium shadow-lg shadow-teal-900/20 transition-all transform active:scale-[0.98] disabled:opacity-70 text-sm"
                                style={{ padding: '14px', fontSize: '16px', letterSpacing: '0.5px', cursor: 'pointer' }}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
