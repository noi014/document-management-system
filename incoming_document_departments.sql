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

 Date: 09/07/2025 18:40:46
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
