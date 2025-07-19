import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { OkPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { email, newPassword } = await req.json(); // In a real app, this would involve a token for security

  if (!email || !newPassword) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  try {
    const connection = await getConnection();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if ((result as OkPacket).affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบผู้ใช้งานด้วยอีเมลนี้' }, { status: 404 });
    }

    return NextResponse.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' }, { status: 500 });
  }
}