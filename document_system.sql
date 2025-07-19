/*
 Navicat Premium Data Transfer

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 100017
 Source Host           : localhost:3306
 Source Schema         : document_system

 Target Server Type    : MySQL
 Target Server Version : 100017
 File Encoding         : 65001

 Date: 19/07/2025 16:47:27
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for departments
-- ----------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(0) NULL DEFAULT NULL,
  `updated_at` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_department_name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of departments
-- ----------------------------
INSERT INTO `departments` VALUES (1, 'สำนักปลัด', NULL, '2025-07-18 19:45:21');
INSERT INTO `departments` VALUES (2, 'กองคลัง', NULL, '2025-07-11 16:12:57');
INSERT INTO `departments` VALUES (3, 'กองช่าง', NULL, NULL);
INSERT INTO `departments` VALUES (4, 'กองการศึกษา', NULL, '2025-07-11 13:50:57');
INSERT INTO `departments` VALUES (5, 'กองสวัสดิการ', NULL, '2025-07-07 19:14:07');
INSERT INTO `departments` VALUES (6, 'ตรวจสอบภายใน', NULL, NULL);
INSERT INTO `departments` VALUES (11, 'test', NULL, NULL);

-- ----------------------------
-- Table structure for document_types
-- ----------------------------
DROP TABLE IF EXISTS `document_types`;
CREATE TABLE `document_types`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_document_type_name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of document_types
-- ----------------------------
INSERT INTO `document_types` VALUES (2, 'หนังสือด่วน');
INSERT INTO `document_types` VALUES (3, 'หนังสือด่วนที่สุด');
INSERT INTO `document_types` VALUES (4, 'หนังสือด่วนมาก');
INSERT INTO `document_types` VALUES (1, 'หนังสือปกติ');
INSERT INTO `document_types` VALUES (5, 'หนังสือลับ');
INSERT INTO `document_types` VALUES (7, 'หนังสือลับที่สุด');
INSERT INTO `document_types` VALUES (6, 'หนังสือลับมาก');

-- ----------------------------
-- Table structure for documents
-- ----------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_by_user_id` int(11) NULL DEFAULT NULL,
  `department_id` int(11) NULL DEFAULT NULL,
  `document_type_id` int(11) NULL DEFAULT NULL,
  `created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_doc_number`(`doc_number`) USING BTREE,
  INDEX `idx_created_by_user_id`(`created_by_user_id`) USING BTREE,
  INDEX `idx_doc_department_id`(`department_id`) USING BTREE,
  INDEX `idx_document_type_id`(`document_type_id`) USING BTREE,
  CONSTRAINT `fk_documents_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_document_type_id` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_user_id` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of documents
-- ----------------------------
INSERT INTO `documents` VALUES (3, '555', 'รายงานงบทดลองหน่วย รพ.ค่ายสมเด็จฯ ประจำปี 2567', '', NULL, 1, 1, 5, '2025-07-05 19:14:19');

-- ----------------------------
-- Table structure for external_agencies
-- ----------------------------
DROP TABLE IF EXISTS `external_agencies`;
CREATE TABLE `external_agencies`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อหน่วยงานภายนอก',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'ที่อยู่',
  `contact_person` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'ผู้ติดต่อ',
  `contact_email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'อีเมลผู้ติดต่อ',
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'เบอร์โทรศัพท์ผู้ติดต่อ',
  `created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่บันทึก',
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0) COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_external_agency_name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of external_agencies
-- ----------------------------
INSERT INTO `external_agencies` VALUES (1, 'รพ.สต.บ้านบัวหลวง', NULL, NULL, NULL, NULL, '2025-07-05 21:10:28', '2025-07-05 21:10:28');
INSERT INTO `external_agencies` VALUES (2, 'อำเภอทุ่งเขาหลวง', NULL, NULL, NULL, NULL, '2025-07-05 21:10:50', '2025-07-11 15:13:47');
INSERT INTO `external_agencies` VALUES (3, 'อบจ.ร้อยเอ็ด', NULL, NULL, NULL, NULL, '2025-07-05 21:11:08', '2025-07-05 21:11:08');
INSERT INTO `external_agencies` VALUES (4, 'สสจ.ร้อยเอ็ด', NULL, NULL, NULL, NULL, '2025-07-05 21:11:23', '2025-07-18 19:45:14');

-- ----------------------------
-- Table structure for incoming_document_departments
-- ----------------------------
DROP TABLE IF EXISTS `incoming_document_departments`;
CREATE TABLE `incoming_document_departments`  (
  `incoming_document_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  PRIMARY KEY (`incoming_document_id`, `department_id`) USING BTREE,
  INDEX `department_id`(`department_id`) USING BTREE
) ENGINE = MyISAM CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Fixed;

-- ----------------------------
-- Records of incoming_document_departments
-- ----------------------------
INSERT INTO `incoming_document_departments` VALUES (3, 6);
INSERT INTO `incoming_document_departments` VALUES (6, 2);
INSERT INTO `incoming_document_departments` VALUES (6, 3);
INSERT INTO `incoming_document_departments` VALUES (7, 1);
INSERT INTO `incoming_document_departments` VALUES (7, 5);
INSERT INTO `incoming_document_departments` VALUES (10, 2);
INSERT INTO `incoming_document_departments` VALUES (11, 1);
INSERT INTO `incoming_document_departments` VALUES (12, 4);
INSERT INTO `incoming_document_departments` VALUES (13, 6);
INSERT INTO `incoming_document_departments` VALUES (14, 1);
INSERT INTO `incoming_document_departments` VALUES (15, 2);
INSERT INTO `incoming_document_departments` VALUES (15, 3);
INSERT INTO `incoming_document_departments` VALUES (16, 1);
INSERT INTO `incoming_document_departments` VALUES (16, 6);
INSERT INTO `incoming_document_departments` VALUES (17, 4);
INSERT INTO `incoming_document_departments` VALUES (19, 1);
INSERT INTO `incoming_document_departments` VALUES (19, 2);
INSERT INTO `incoming_document_departments` VALUES (19, 4);
INSERT INTO `incoming_document_departments` VALUES (20, 1);
INSERT INTO `incoming_document_departments` VALUES (20, 2);

-- ----------------------------
-- Table structure for incoming_documents
-- ----------------------------
DROP TABLE IF EXISTS `incoming_documents`;
CREATE TABLE `incoming_documents`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'เลขที่หนังสือรับ',
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'เรื่องหนังสือ',
  `from_agency_id` int(11) NULL DEFAULT NULL COMMENT 'FK: หน่วยงานต้นทาง (อ้างอิงจาก external_agencies)',
  `received_date` date NOT NULL COMMENT 'วันที่รับ',
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'Path ของไฟล์ที่แนบ',
  `document_type_id` int(11) NULL DEFAULT NULL COMMENT 'FK: ประเภทเอกสาร (อ้างอิงจาก document_types)',
  `created_by_user_id` int(11) NULL DEFAULT NULL COMMENT 'FK: ผู้บันทึก (อ้างอิงจาก users)',
  `created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่บันทึก',
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0) COMMENT 'วันที่แก้ไขล่าสุด',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_incoming_doc_number`(`doc_number`) USING BTREE,
  INDEX `idx_incoming_document_type_id`(`document_type_id`) USING BTREE,
  INDEX `idx_incoming_created_by_user_id`(`created_by_user_id`) USING BTREE,
  INDEX `fk_incoming_from_agency_id`(`from_agency_id`) USING BTREE,
  CONSTRAINT `fk_incoming_created_by_user_id` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incoming_document_type_id` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incoming_from_agency_id` FOREIGN KEY (`from_agency_id`) REFERENCES `external_agencies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of incoming_documents
-- ----------------------------
INSERT INTO `incoming_documents` VALUES (3, '5559911', '55', 3, '2025-07-27', '/uploads/b2a0047b-0363-4f21-a3e1-dc49bb4368f0.jpg', 2, 1, '2025-07-05 20:27:50', '2025-07-10 20:43:53');
INSERT INTO `incoming_documents` VALUES (6, '55599113', '55+++++++++++++555', 4, '2025-07-08', '/uploads/e47404c2-c469-4f74-be28-3ce6119f807c.jpg', 2, 1, '2025-07-07 20:07:49', '2025-07-08 21:39:48');
INSERT INTO `incoming_documents` VALUES (7, '55599119', '55+++++++++++++555', 2, '2025-07-15', '/uploads/120f478a-f25c-4725-b3df-d72c45132771.jpg', 1, 1, '2025-07-07 20:08:42', '2025-07-11 20:33:49');
INSERT INTO `incoming_documents` VALUES (8, '55599110', '55+++++++++++++555', 2, '2025-07-06', '/uploads/3547c921-5e68-4fa4-9a5d-3fd20faa9c18.jpg', 3, 1, '2025-07-07 20:08:59', '2025-07-07 20:10:10');
INSERT INTO `incoming_documents` VALUES (10, '5559908', '55+++++++++++++555', 4, '2025-07-06', '/uploads/a2178533-198e-4134-b3fc-b900c095115f.png', 2, 1, '2025-07-07 20:09:33', '2025-07-10 18:15:36');
INSERT INTO `incoming_documents` VALUES (11, '5559907', '55+++++++++++++555', 1, '2025-07-06', '/uploads/8e8dc9cc-e986-4620-a02a-0543ffc6888d.png', 3, 1, '2025-07-07 20:11:07', '2025-07-09 19:55:07');
INSERT INTO `incoming_documents` VALUES (12, '5559904', '55+++++++++++++555', 1, '2025-07-06', '/uploads/e7f2a0cc-ad07-489e-bd05-fde16823d278.png', 2, 1, '2025-07-07 20:11:28', '2025-07-09 19:54:59');
INSERT INTO `incoming_documents` VALUES (13, '5559903', '55+++++++++++++555', 4, '2025-07-06', '/uploads/cc92fe4a-8743-42f3-ac43-953b4ed21bdd.jpg', 3, 1, '2025-07-07 20:11:46', '2025-07-08 21:33:52');
INSERT INTO `incoming_documents` VALUES (14, '5559902', '55+++++++++++++555', 1, '2025-07-06', '/uploads/44a13a5e-f8e8-49ef-8801-a92ea8f952b4.jpg', 3, 1, '2025-07-07 20:12:24', '2025-07-08 21:33:44');
INSERT INTO `incoming_documents` VALUES (15, '5559901', '55+++++++++++++555', 1, '2025-07-06', '/uploads/7f416fd6-09dd-4e57-878e-6403c1eb3438.jpg', 2, 1, '2025-07-07 20:13:20', '2025-07-08 21:33:35');
INSERT INTO `incoming_documents` VALUES (16, '5559900', '55+++++++++++++555', 1, '2025-07-05', '/uploads/a5f26eff-05ad-4413-aaa1-2eeea049ee0c.jpg', 3, 1, '2025-07-07 21:08:45', '2025-07-08 21:33:29');
INSERT INTO `incoming_documents` VALUES (17, '4559900', '55+++++++++++++555', 4, '2025-07-05', NULL, 1, 1, '2025-07-07 21:54:03', '2025-07-10 18:16:13');
INSERT INTO `incoming_documents` VALUES (19, '9959900', '55+++++++++++++555', 3, '2025-07-09', NULL, 3, 1, '2025-07-09 18:43:39', '2025-07-10 15:59:16');
INSERT INTO `incoming_documents` VALUES (20, '9959901', '55+++++++++++++555', 1, '2025-07-10', NULL, 4, 3, '2025-07-10 18:26:07', '2025-07-11 19:52:02');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','user','super_user') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `department_id` int(11) NULL DEFAULT NULL,
  `created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_username`(`username`) USING BTREE,
  INDEX `idx_department_id`(`department_id`) USING BTREE,
  CONSTRAINT `fk_users_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'noi014', 'noi.00145@gmail.com', '$2b$10$wQnmIDzP/xzLZHDm6NqloueJEptLLEBgnogSYDZqsnha0Z3zBWKZO', 'admin', 3, '2025-07-04 19:20:04', '2025-07-18 19:45:06');
INSERT INTO `users` VALUES (3, 'noi0144', 'noi.00144@gmail.com', '$2b$10$Jg8Yjc7.YKoCZcrdLx66wOzIgu27Lyd/AAh22iYLGSpZ0oJ6fgSIy', 'super_user', 1, '2025-07-05 21:45:41', '2025-07-10 14:23:40');
INSERT INTO `users` VALUES (4, 'noi015', 'noi.0014@gmail.com', '$2b$10$uRfuXio345ZN9dwlvX5ah.cEFeTfXee.sdxq9Uj/9JyLHstC.kc0q', 'user', 2, '2025-07-09 21:20:21', '2025-07-10 14:23:45');
INSERT INTO `users` VALUES (5, 'noi0149', 'noi.00149@gmail.com', '$2b$10$69L6/PZ0SnjZLGtha4vp3Ozt5ZPMrh4O/BGSyVok6GfvwctWDV0iK', 'user', 5, '2025-07-10 14:59:03', '2025-07-10 14:59:03');
INSERT INTO `users` VALUES (8, 'noi01499', 'noi.001499@gmail.com', '$2b$10$C/rCmTSCO/HakVrnniEH4eDlrDErnanbz5YGzcyWQkoVwAmXL5N5i', 'user', 1, '2025-07-18 20:18:33', '2025-07-18 20:18:33');

SET FOREIGN_KEY_CHECKS = 1;
