import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // ใช้ jose แทน jsonwebtoken ใน middleware

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // ถ้าไม่มี token และพยายามเข้าหน้าอื่นที่ไม่ใช่ /login ให้ redirect
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ถ้ามี token และพยายามเข้าหน้า login ให้ redirect ไปหน้า dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/docs/incoming', req.url));
  }

  // ตรวจสอบความถูกต้องของ Token
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      // ถ้าต้องการเช็คสิทธิ์ admin สำหรับบางหน้า
      if (pathname.startsWith('/admin') && payload.role !== 'admin') {
         return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    } catch (err) {
      // ถ้า token ไม่ถูกต้อง ให้ลบ cookie แล้ว redirect ไปหน้า login
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};