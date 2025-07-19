import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 //output: 'export',
  /* config options here */
};

export default nextConfig;

// const isProd = process.env.NODE_ENV === 'production';
// module.exports = {
//   // env: {
//   //   PUBLIC_URL: isProd ?'/next-yodfadatacenter': '',
//   //   PUBLIC_URL_IMG: isProd ?
//   //   'https://yodfahospital.rta.mi.th/strapi/strapi_datacenter': 'https://yodfahospital.rta.mi.th/strapi/strapi_datacenter',
   
//   //  NEXT_PUBLIC_STRAPI_URL: "https://yodfahospital.rta.mi.th/strapi/strapi_datacenter/api", // URL ของ Strapi ที่คุณใช้งาน
//   // },
//   basePath: isProd ? "/document-management-system" : '', // เปลี่ยน "/my-app" เป็นพาธที่คุณต้องการ
//   assetPrefix: isProd ? "/document-management-system/" : '', // เปลี่ยน "/my-app/" เป็นพาธที่คุณต้องการ
//    // assetPrefix: isProd ? "http://localhost/next-yodfahospital/" : undefined,
//     // images: {
       
//     //      domains: isProd ? ["/next-yodfadatacenter_demo/"] : '',
//     //      path:  isProd ? "/next-yodfadatacenter_demo/" : '',
//     //     unoptimized: true
//     //   },
//     images: {
//       unoptimized: true
//     },
//       reactStrictMode: true,
//    //   output: 'export',
//     // exportPathMap: async function () {
//     //   return {
//     //     '/': { page: '/' }, // ตัวอย่างหน้าหลักของเว็บไซต์ '/next-yodfahospital'
//     //     // คุณสามารถเพิ่มหน้าอื่น ๆ ที่คุณต้องการที่จะให้ Next.js สร้างและแสดงผลได้ตามต้องการ
//     //     // ตัวอย่าง: 
//     //    // '/data_info': { page: '/data_info' },
//     //     // ตัวอย่าง: '/contact': { page: '/contact' },
//     //   };
//     // },
//   };

