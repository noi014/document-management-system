// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getConnection } from '@/lib/db';
import bcrypt from 'bcryptjs'; // For password comparison

// --- Interface for User data from DB ---
interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  email: string | null;
  department_id: number | null;
  role: 'admin' | 'super_user' | 'user';
  department_name?: string; // Optional, will be added by JOIN
}

export async function POST(req: NextRequest) {
  let connection: PoolConnection | undefined;
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' }, { status: 400 });
    }

    connection = await getConnection();

    // Fetch user data including department name
    const [rows] = await connection.execute<UserRow[]>(
      `SELECT
         u.id,
         u.username,
         u.password,
         u.email,
         u.department_id,
         u.role,
         d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.username = ?`,
      [username]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Compare hashed password (IMPORTANT: Use bcrypt.compare in production)
    const isPasswordValid = await bcrypt.compare(password, user.password);
   // const isPasswordValid = (password === user.password); // Placeholder for testing without actual hashing

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Return user data including department_name
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name || null, // Ensure it's null if no department
    }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
