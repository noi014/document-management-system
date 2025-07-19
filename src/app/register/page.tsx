// src/app/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Add this line to import the Link component

// กำหนด Type สำหรับ Department
interface Department {
  id: number;
  name: string;
}

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  // department state จะเก็บ department ID (number)
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  // departments state จะเก็บ Array ของ Department objects
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // --- useEffect สำหรับดึงข้อมูลแผนก ---
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch('/api/admin/departments'); // เรียก API ที่แก้ไขแล้ว
        if (!response.ok) {
          throw new Error('Failed to fetch departments');
        }
        const data: Department[] = await response.json(); // คาดหวัง Array ของ Department objects

        setDepartments(data);
       
         //console.log(data.length);
        if (data.length > 0) {
          setDepartmentId(data[0].id); // ตั้งค่าเริ่มต้นเป็นแผนกแรก
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
      } finally {
        setLoadingDepartments(false);
      }
    }
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (departmentId === '') {
      setError('กรุณาเลือกหน่วยงานภายใน');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password, 
          email,
          departmentId: departmentId,
          role: 'user', // กำหนด role เริ่มต้นเป็น 'user'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('ลงทะเบียนสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setDepartmentId(''); // Reset department selection
        // Optionally redirect to login page after successful registration
        router.push('/auth/login');
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          ลงทะเบียนผู้ใช้งานใหม่
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="mb-2 block text-sm font-bold text-gray-700">
              ชื่อผู้ใช้งาน
            </label>
            <input
              type="text"
              id="username"
              className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-gray-700">
              อีเมล (ไม่บังคับ)
            </label>
            <input
              type="email"
              id="email"
              className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="department" className="mb-2 block text-sm font-bold text-gray-700">
              หน่วยงานภายใน
            </label>
            {loadingDepartments ? (
              <p>กำลังโหลดหน่วยงาน...</p>
            ) : departments.length === 0 ? (
              <p className="text-red-500">
                ไม่พบหน่วยงานภายใน กรุณาเพิ่มหน่วยงานในระบบก่อนลงทะเบียนผู้ใช้
              </p>
            ) : (
              <select
                id="department"
                className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                required
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-gray-700">
              รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-gray-700">
              ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="mb-4 text-xs italic text-red-500">{error}</p>}
          {success && <p className="mb-4 text-xs italic text-green-500">{success}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="focus:shadow-outline rounded bg-green-500 py-2 px-4 font-bold text-white hover:bg-green-700 focus:outline-none"
              // ปิดปุ่มถ้ากำลังโหลดแผนก, ไม่มีแผนก, หรือยังไม่ได้เลือกแผนก
              disabled={loadingDepartments || departments.length === 0 || departmentId === ''}
            >
              ลงทะเบียน
            </button>
            <Link href="/auth/login" className="inline-block align-baseline text-sm font-bold text-blue-500 hover:text-blue-800">
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}