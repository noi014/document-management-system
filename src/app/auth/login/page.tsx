// src/app/auth/login/page.tsx
'use client'; // This component needs 'use client' because it uses useState, useEffect, and client-side hooks

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Loader2, LogIn } from 'lucide-react'; // Import icons
import Link from 'next/link'; // Import Link for navigation

// Simple Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth(); // Get login, isAuthenticated, isLoading
  const router = useRouter();

  // If already authenticated and not in loading state, redirect to dashboard/home
  // This prevents logged-in users from seeing the login page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/'); // หรือหน้าที่คุณต้องการให้ไปหลัง Login สำเร็จ
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state if auth context is still loading
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Spinner />
        <span className="ml-2 text-blue-600">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</span>
      </div>
    );
  }

  // If already authenticated, return null to prevent rendering the login form
  // as the useEffect above will handle the redirect.
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Call the login function from AuthContext to set user state globally
        login({
          id: data.id,
          username: data.username,
          role: data.role, // Ensure this matches 'admin', 'super_user', 'user'
          department_id: data.department_id,
          department_name: data.department_name || null, // Pass department_name, default to null if not present
        });

        // The AuthContext's login function (or ResponsiveSidebar's useEffect) will handle the redirect
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ!',
          text: data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          confirmButtonText: 'ตกลง',
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center">
          <LogIn className="w-8 h-8 mr-3 text-blue-600" /> เข้าสู่ระบบ
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">
              ชื่อผู้ใช้งาน
            </label>
            <input
              type="text"
              id="username"
              className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="flex flex-col items-center justify-between gap-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 w-full flex items-center justify-center"
              disabled={loading}
            >
              {loading ? <Spinner /> : <LogIn className="w-5 h-5 mr-2" />}
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
            <div className="mt-4 text-center w-full">
              <Link href="/register" className="inline-block align-baseline font-semibold text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-2">
                ลงทะเบียนผู้ใช้งานใหม่
              </Link>

            
            </div>
            <div className="mt-4 text-center w-full">
             
              
              <Link href="/reset-password" className="inline-block align-baseline font-semibold text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200">
                ลืมรหัสผ่าน?
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
