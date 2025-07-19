// app/api/users/auth-info/route.ts
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
//export const dynamic = "force-static";
// GET: ดึงข้อมูลบทบาทและ department_id ของผู้ใช้
export async function GET(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    // ดึง userId จาก custom header 'x-user-id'
    const userIdHeader = req.headers.get('x-user-id');
    const userId = userIdHeader ? parseInt(userIdHeader) : 0;

    if (userId === 0 || isNaN(userId)) { // หาก userId ไม่ได้ให้มาหรือไม่ถูกต้อง
      return NextResponse.json({ message: 'ไม่พบ User ID หรือ User ID ไม่ถูกต้อง', error: 'Unauthorized' }, { status: 401 });
    }

    connection = await getConnection();
    // Query เพื่อดึงบทบาทและ department_id ของผู้ใช้
    const [rows] = await connection.query(
      `SELECT role, department_id FROM users WHERE id = ?`,
      [userId]
    );
    const user = (rows as RowDataPacket[])[0];

    if (user) {
      return NextResponse.json({
        role: user.role as string,
        department_id: user.department_id as number | null,
      });
    } else {
      return NextResponse.json({ message: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 });
    }

  } catch (error) {
    console.error('Failed to fetch user auth info (Backend Error):', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}


