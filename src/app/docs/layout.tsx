import ResponsiveSidebar from '@/components/ResponsiveSidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ไม่ต้องมี div ครอบแล้ว เพราะ Component ของเราจัดการ layout ทั้งหมด
    <ResponsiveSidebar>
      {children}
    </ResponsiveSidebar>
  );
}