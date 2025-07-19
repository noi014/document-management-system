// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // สำหรับสร้างชื่อไฟล์ที่ไม่ซ้ำกัน
import fs from 'fs'; // Changed from require('fs') to ES module import

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File; // 'file' คือชื่อ field ใน FormData

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // กำหนด directory สำหรับเก็บไฟล์
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน (เช่น uuid + original extension)
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // ตรวจสอบและสร้าง folder ถ้ายังไม่มี
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await writeFile(filePath, buffer);

    // ส่ง path ที่จะใช้บันทึกลงฐานข้อมูลกลับไป (เป็น relative path จาก public)
    const relativePath = path.join('/uploads', uniqueFileName).replace(/\\\\/g, '/'); // ทำให้เป็น POSIX path
    return NextResponse.json({ filePath: relativePath });
  } catch (error) {
    console.error('File upload failed:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}