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

 Date: 09/07/2025 18:40:55
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Compact;

SET FOREIGN_KEY_CHECKS = 1;
