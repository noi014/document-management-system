// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getConnection } from '@/lib/db';
// import bcrypt from 'bcrypt'; // Uncomment if you install bcrypt for password hashing
//export const dynamic = "force-static";
// --- Interface for type safety ---
interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string | null;
  password_hash: string; // Assuming passwords are hashed
  department_id: number | null;
  role: 'admin' | 'super-user' | 'user'; // Updated to include 'super-user'
  // For JOINs:
  department_name?: string;
  created_at: string;
  updated_at: string;
}

// --- Helper function to check admin/super-user role ---
// ใน production ควรใช้ middleware หรือ JWT token เพื่อการตรวจสอบสิทธิ์ที่เหมาะสม
async function checkAdminOrSuperUserRole(userId: number): Promise<boolean> {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT role FROM users WHERE id = ?', [userId]);
    const users = rows as { role: string }[];
    // Allow access if role is 'admin' or 'super-user'
    return users.length > 0 && (users[0].role === 'admin' || users[0].role === 'super-user');
  } catch (error) {
    console.error('Error checking admin/super-user role:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// --- GET: Fetch all users with their department names ---
export async function GET(req: Request) {
  let connection: PoolConnection | undefined;
  
  // Get user ID from request headers
  const userIdHeader = req.headers.get('X-User-ID');
  const userId = userIdHeader ? parseInt(userIdHeader) : null;

  if (userId === null || isNaN(userId) || !(await checkAdminOrSuperUserRole(userId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  try {
    connection = await getConnection();
    const [rows] = await connection.execute<UserRow[]>(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.role,
         u.department_id,
         d.name AS department_name,
         u.created_at
      
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.username ASC`
    );
    // Return data in { data: [...] } format for consistency with other APIs
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- POST: Add a new user ---
export async function POST(req: Request) {
  let connection: PoolConnection | undefined;
  const { username, email, password, department_id, role } = await req.json();

  // Get user ID from request headers
  const userIdHeader = req.headers.get('X-User-ID');
  const userId = userIdHeader ? parseInt(userIdHeader) : null;

  if (userId === null || isNaN(userId) || !(await checkAdminOrSuperUserRole(userId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!username || !password || !role) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน: ชื่อผู้ใช้งาน, รหัสผ่าน, และสิทธิ์ เป็นค่าที่จำเป็น' }, { status: 400 });
  }

  try {
    connection = await getConnection();

    // Check for existing username or email
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรืออีเมลนี้มีอยู่แล้ว' }, { status: 409 });
    }
 
    // --- Password Hashing (IMPORTANT: Implement proper hashing in production) ---
    // const saltRounds = 10;
    // const passwordHash = await bcrypt.hash(password, saltRounds);
    const passwordHash = password; // Placeholder: Replace with actual hashing

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (username, email, password_hash, department_id, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email || null, passwordHash, department_id || null, role]
    );
    return NextResponse.json({ message: 'เพิ่มผู้ใช้งานสำเร็จ', id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- PUT: Update an existing user ---
export async function PUT(req: Request) {
  let connection: PoolConnection | undefined;
  // Note: Password is NOT updated via this route for security best practices.
  // Password changes should be handled through a separate, authenticated process.
  const { id, username, email, department_id, role } = await req.json();

  // Get user ID from request headers
  const userIdHeader = req.headers.get('X-User-ID');
  const userId = userIdHeader ? parseInt(userIdHeader) : null;

  if (userId === null || isNaN(userId) || !(await checkAdminOrSuperUserRole(userId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || !username || !role) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน: ID, ชื่อผู้ใช้งาน, และสิทธิ์ เป็นค่าที่จำเป็น' }, { status: 400 });
  }

  try {
    connection = await getConnection();

    // Check for existing username or email for *other* users
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, id]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรืออีเมลนี้มีอยู่แล้วสำหรับผู้ใช้งานอื่น' }, { status: 409 });
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE users
       SET username = ?, email = ?, department_id = ?, role = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [username, email || null, department_id || null, role, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบผู้ใช้งานที่ต้องการอัพเดท' }, { status: 404 });
    }
    return NextResponse.json({ message: 'อัพเดทผู้ใช้งานสำเร็จ' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการอัพเดทผู้ใช้งาน', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- DELETE: Delete a user ---
export async function DELETE(req: Request) {
  let connection: PoolConnection | undefined;
  const { id } = await req.json();

  // Get user ID from request headers
  const userIdHeader = req.headers.get('X-User-ID');
  const userId = userIdHeader ? parseInt(userIdHeader) : null;

  if (userId === null || isNaN(userId) || !(await checkAdminOrSuperUserRole(userId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'ID ผู้ใช้งานไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    connection = await getConnection();

    // Optional: Check if the user is the last admin. Prevent deleting the last admin.
    // const [adminCount] = await connection.execute<RowDataPacket[]>(
    //   'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
    // );
    // if ((adminCount[0] as any).count === 1 && id === adminId) { // Assuming adminId is the ID of the current admin
    //   return NextResponse.json({ message: 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้' }, { status: 403 });
    // }

    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบผู้ใช้งานที่ต้องการลบ' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
