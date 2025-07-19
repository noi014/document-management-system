// components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowDownOnSquareIcon,
  ArrowUpOnSquareIcon,
  SpeakerWaveIcon,
  ClipboardDocumentListIcon,
  NewspaperIcon,
  PencilSquareIcon,
  UserGroupIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'; // ใช้ outline icons เพื่อความเรียบง่าย

// ปรับปรุง Array ของลิงก์ให้มีไอคอนด้วย
const documentLinks = [
  { name: 'หนังสือรับ', href: '/docs/incoming', icon: ArrowDownOnSquareIcon },
  { name: 'หนังสือส่ง', href: '/docs/outgoing', icon: ArrowUpOnSquareIcon },
  { name: 'หนังสือส่ง ว', href: '/docs/circular', icon: SpeakerWaveIcon },
  { name: 'หนังสือคำสั่ง', href: '/docs/orders', icon: ClipboardDocumentListIcon },
  { name: 'หนังสือประกาศ', href: '/docs/announcements', icon: NewspaperIcon },
  { name: 'หนังสือบันทึกข้อความ', href: '/docs/memos', icon: PencilSquareIcon },
];

const adminLinks = [
    { name: 'จัดการผู้ใช้งาน', href: '/admin/users', icon: UserGroupIcon }
]

export default function Sidebar() {
  const pathname = usePathname();

  // ฟังก์ชันสำหรับ handle การออกจากระบบ (ตัวอย่าง)
  const handleLogout = () => {
    // ที่จุดนี้คุณต้อง implement ลบ token/cookie แล้ว redirect
    console.log('Logging out...');
    // router.push('/login');
  };

  return (
    <div className="flex h-screen flex-col justify-between bg-base-200 text-base-content w-72 p-4">
      <div>
        {/* ส่วนหัวของ Sidebar */}
        <div className="flex items-center gap-2 px-4 mb-6">
            <BookOpenIcon className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">ระบบเอกสาร</h1>
        </div>

        {/* เมนูหลัก */}
        <ul className="menu text-lg">
          {documentLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <li key={link.name}>
                <Link href={link.href} className={`${isActive ? 'active' : ''}`}>
                  <Icon className="h-6 w-6" />
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ส่วนของผู้ดูแลระบบ */}
        <div className="divider text-sm">สำหรับผู้ดูแล</div>
        <ul className="menu text-lg">
            {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                    <li key={link.name}>
                        <Link href={link.href} className={`${isActive ? 'active' : ''}`}>
                          <Icon className="h-6 w-6" />
                          {link.name}
                        </Link>
                    </li>
                )
            })}
        </ul>
      </div>

      {/* ส่วนข้อมูลผู้ใช้และออกจากระบบ */}
      <div className="flex flex-col gap-4">
         <div className="divider"></div>
         <div className="flex items-center gap-3 px-4">
            <UserCircleIcon className="h-10 w-10 text-neutral"/>
            <div>
                <p className="font-bold">สมชาย ใจดี</p>
                <p className="text-sm text-base-content/70">กองช่าง</p>
            </div>
         </div>
        <button onClick={handleLogout} className="btn btn-ghost justify-start text-lg">
          <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}