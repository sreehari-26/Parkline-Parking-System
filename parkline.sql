-- MySQL dump 10.13  Distrib 8.0.37, for Win64 (x86_64)
--
-- Host: localhost    Database: parkline_db
-- ------------------------------------------------------
-- Server version	8.0.37

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `vehicle_id` int unsigned NOT NULL,
  `lot_id` int unsigned NOT NULL,
  `slot_id` int unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  KEY `vehicle_id` (`vehicle_id`,`user_id`),
  KEY `lot_id` (`lot_id`),
  KEY `slot_id` (`slot_id`,`lot_id`),
  KEY `idx_booking_slot_time` (`slot_id`,`start_time`,`end_time`),
  KEY `idx_booking_user` (`user_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`vehicle_id`, `user_id`) REFERENCES `vehicles` (`vehicle_id`, `user_id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`lot_id`) REFERENCES `parking_lots` (`lot_id`),
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`slot_id`, `lot_id`) REFERENCES `parking_slots` (`slot_id`, `lot_id`),
  CONSTRAINT `bookings_chk_1` CHECK ((`end_time` > `start_time`)),
  CONSTRAINT `bookings_chk_2` CHECK ((`amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,1,1,1,40,'2026-11-04 12:46:10','2026-11-04 15:46:10',100.00,'CONFIRMED','2026-11-03 07:16:10'),(2,3,4,3,294,'2026-11-03 15:00:00','2026-11-03 18:00:00',150.00,'CONFIRMED','2026-11-03 08:31:04'),(3,4,5,5,398,'2026-11-03 22:00:00','2026-11-03 23:00:00',50.00,'CONFIRMED','2026-11-03 12:54:11');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parking_lots`
--

DROP TABLE IF EXISTS `parking_lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_lots` (
  `lot_id` int unsigned NOT NULL AUTO_INCREMENT,
  `lot_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`lot_id`),
  UNIQUE KEY `lot_name` (`lot_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_lots`
--

LOCK TABLES `parking_lots` WRITE;
/*!40000 ALTER TABLE `parking_lots` DISABLE KEYS */;
INSERT INTO `parking_lots` VALUES (1,'Kannur Caltex','Caltex Junction, Kannur, Kerala',1),(2,'Calicut Hilite','Hilite Mall, Kozhikode, Kerala',1),(3,'Calicut SM Street','SM Street, Kozhikode, Kerala',1),(4,'Fort Kochi Marine Drive','Marine Drive, Kochi, Kerala',1),(5,'Thrissur Shaktan Stand','Shaktan Stand, Thrissur, Kerala',1),(6,'Thiruvananthapuram MG','MG Road, Thiruvananthapuram, Kerala',1),(7,'Palakkad Kollengode','Kollengode, Palakkad, Kerala',1),(8,'Munnar Idukki','Munnar, Idukki, Kerala',1);
/*!40000 ALTER TABLE `parking_lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parking_slots`
--

DROP TABLE IF EXISTS `parking_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_slots` (
  `slot_id` int unsigned NOT NULL AUTO_INCREMENT,
  `lot_id` int unsigned NOT NULL,
  `floor_number` int NOT NULL,
  `slot_number` varchar(20) NOT NULL,
  `vehicle_type` enum('EV','SCOOTER','FOUR_WHEELER','HEAVY') NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`slot_id`),
  UNIQUE KEY `lot_id` (`lot_id`,`floor_number`,`slot_number`),
  UNIQUE KEY `slot_id` (`slot_id`,`lot_id`),
  CONSTRAINT `parking_slots_ibfk_1` FOREIGN KEY (`lot_id`) REFERENCES `parking_lots` (`lot_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=639 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_slots`
--

LOCK TABLES `parking_slots` WRITE;
/*!40000 ALTER TABLE `parking_slots` DISABLE KEYS */;
INSERT INTO `parking_slots` VALUES (1,2,0,'S104','HEAVY',1),(2,2,1,'S204','HEAVY',1),(3,2,2,'S304','HEAVY',1),(4,2,0,'S103','FOUR_WHEELER',1),(5,2,1,'S203','FOUR_WHEELER',1),(6,2,2,'S303','FOUR_WHEELER',1),(7,2,0,'S102','SCOOTER',1),(8,2,1,'S202','SCOOTER',1),(9,2,2,'S302','SCOOTER',1),(10,2,0,'S101','EV',1),(11,2,1,'S201','EV',1),(12,2,2,'S301','EV',1),(13,3,0,'S104','HEAVY',1),(14,3,1,'S204','HEAVY',1),(15,3,2,'S304','HEAVY',1),(16,3,0,'S103','FOUR_WHEELER',1),(17,3,1,'S203','FOUR_WHEELER',1),(18,3,2,'S303','FOUR_WHEELER',1),(19,3,0,'S102','SCOOTER',1),(20,3,1,'S202','SCOOTER',1),(21,3,2,'S302','SCOOTER',1),(22,3,0,'S101','EV',1),(23,3,1,'S201','EV',1),(24,3,2,'S301','EV',1),(25,4,0,'S104','HEAVY',1),(26,4,1,'S204','HEAVY',1),(27,4,2,'S304','HEAVY',1),(28,4,0,'S103','FOUR_WHEELER',1),(29,4,1,'S203','FOUR_WHEELER',1),(30,4,2,'S303','FOUR_WHEELER',1),(31,4,0,'S102','SCOOTER',1),(32,4,1,'S202','SCOOTER',1),(33,4,2,'S302','SCOOTER',1),(34,4,0,'S101','EV',1),(35,4,1,'S201','EV',1),(36,4,2,'S301','EV',1),(37,1,0,'S104','HEAVY',1),(38,1,1,'S204','HEAVY',1),(39,1,2,'S304','HEAVY',1),(40,1,0,'S103','FOUR_WHEELER',1),(41,1,1,'S203','FOUR_WHEELER',1),(42,1,2,'S303','FOUR_WHEELER',1),(43,1,0,'S102','SCOOTER',1),(44,1,1,'S202','SCOOTER',1),(45,1,2,'S302','SCOOTER',1),(46,1,0,'S101','EV',1),(47,1,1,'S201','EV',1),(48,1,2,'S301','EV',1),(49,8,0,'S104','HEAVY',1),(50,8,1,'S204','HEAVY',1),(51,8,2,'S304','HEAVY',1),(52,8,0,'S103','FOUR_WHEELER',1),(53,8,1,'S203','FOUR_WHEELER',1),(54,8,2,'S303','FOUR_WHEELER',1),(55,8,0,'S102','SCOOTER',1),(56,8,1,'S202','SCOOTER',1),(57,8,2,'S302','SCOOTER',1),(58,8,0,'S101','EV',1),(59,8,1,'S201','EV',1),(60,8,2,'S301','EV',1),(61,7,0,'S104','HEAVY',1),(62,7,1,'S204','HEAVY',1),(63,7,2,'S304','HEAVY',1),(64,7,0,'S103','FOUR_WHEELER',1),(65,7,1,'S203','FOUR_WHEELER',1),(66,7,2,'S303','FOUR_WHEELER',1),(67,7,0,'S102','SCOOTER',1),(68,7,1,'S202','SCOOTER',1),(69,7,2,'S302','SCOOTER',1),(70,7,0,'S101','EV',1),(71,7,1,'S201','EV',1),(72,7,2,'S301','EV',1),(73,6,0,'S104','HEAVY',1),(74,6,1,'S204','HEAVY',1),(75,6,2,'S304','HEAVY',1),(76,6,0,'S103','FOUR_WHEELER',1),(77,6,1,'S203','FOUR_WHEELER',1),(78,6,2,'S303','FOUR_WHEELER',1),(79,6,0,'S102','SCOOTER',1),(80,6,1,'S202','SCOOTER',1),(81,6,2,'S302','SCOOTER',1),(82,6,0,'S101','EV',1),(83,6,1,'S201','EV',1),(84,6,2,'S301','EV',1),(85,5,0,'S104','HEAVY',1),(86,5,1,'S204','HEAVY',1),(87,5,2,'S304','HEAVY',1),(88,5,0,'S103','FOUR_WHEELER',1),(89,5,1,'S203','FOUR_WHEELER',1),(90,5,2,'S303','FOUR_WHEELER',1),(91,5,0,'S102','SCOOTER',1),(92,5,1,'S202','SCOOTER',1),(93,5,2,'S302','SCOOTER',1),(94,5,0,'S101','EV',1),(95,5,1,'S201','EV',1),(96,5,2,'S301','EV',1),(128,1,0,'R020','EV',1),(129,1,0,'R019','FOUR_WHEELER',1),(130,1,0,'R018','SCOOTER',1),(131,1,0,'R017','HEAVY',1),(132,1,0,'R016','SCOOTER',1),(133,1,0,'R015','FOUR_WHEELER',1),(134,1,0,'R014','FOUR_WHEELER',1),(135,1,0,'R013','HEAVY',1),(136,1,0,'R012','HEAVY',1),(137,1,0,'R011','FOUR_WHEELER',1),(138,1,0,'R010','HEAVY',1),(139,1,0,'R009','SCOOTER',1),(140,1,0,'R008','EV',1),(141,1,0,'R007','SCOOTER',1),(142,1,0,'R006','EV',1),(143,1,0,'R005','FOUR_WHEELER',1),(144,1,0,'R004','EV',1),(145,1,0,'R003','SCOOTER',1),(146,1,0,'R002','SCOOTER',1),(147,1,0,'R001','FOUR_WHEELER',1),(148,1,1,'R020','FOUR_WHEELER',1),(149,1,1,'R019','HEAVY',1),(150,1,1,'R018','SCOOTER',1),(151,1,1,'R017','HEAVY',1),(152,1,1,'R016','EV',1),(153,1,1,'R015','EV',1),(154,1,1,'R014','FOUR_WHEELER',1),(155,1,1,'R013','HEAVY',1),(156,1,1,'R012','FOUR_WHEELER',1),(157,1,1,'R011','HEAVY',1),(158,1,1,'R010','SCOOTER',1),(159,1,1,'R009','EV',1),(160,1,1,'R008','HEAVY',1),(161,1,1,'R007','EV',1),(162,1,1,'R006','FOUR_WHEELER',1),(163,1,1,'R005','FOUR_WHEELER',1),(164,1,1,'R004','SCOOTER',1),(165,1,1,'R003','FOUR_WHEELER',1),(166,1,1,'R002','EV',1),(167,1,1,'R001','FOUR_WHEELER',1),(168,1,2,'R020','EV',1),(169,1,2,'R019','FOUR_WHEELER',1),(170,1,2,'R018','EV',1),(171,1,2,'R017','SCOOTER',1),(172,1,2,'R016','EV',1),(173,1,2,'R015','EV',1),(174,1,2,'R014','EV',1),(175,1,2,'R013','FOUR_WHEELER',1),(176,1,2,'R012','FOUR_WHEELER',1),(177,1,2,'R011','SCOOTER',1),(178,1,2,'R010','FOUR_WHEELER',1),(179,1,2,'R009','EV',1),(180,1,2,'R008','EV',1),(181,1,2,'R007','SCOOTER',1),(182,1,2,'R006','SCOOTER',1),(183,1,2,'R005','HEAVY',1),(184,1,2,'R004','FOUR_WHEELER',1),(185,1,2,'R003','SCOOTER',1),(186,1,2,'R002','SCOOTER',1),(187,1,2,'R001','SCOOTER',1),(188,2,0,'R020','FOUR_WHEELER',1),(189,2,0,'R019','FOUR_WHEELER',1),(190,2,0,'R018','FOUR_WHEELER',1),(191,2,0,'R017','FOUR_WHEELER',1),(192,2,0,'R016','HEAVY',1),(193,2,0,'R015','HEAVY',1),(194,2,0,'R014','EV',1),(195,2,0,'R013','SCOOTER',1),(196,2,0,'R012','EV',1),(197,2,0,'R011','SCOOTER',1),(198,2,0,'R010','EV',1),(199,2,0,'R009','FOUR_WHEELER',1),(200,2,0,'R008','FOUR_WHEELER',1),(201,2,0,'R007','HEAVY',1),(202,2,0,'R006','HEAVY',1),(203,2,0,'R005','HEAVY',1),(204,2,0,'R004','SCOOTER',1),(205,2,0,'R003','FOUR_WHEELER',1),(206,2,0,'R002','FOUR_WHEELER',1),(207,2,0,'R001','SCOOTER',1),(208,2,1,'R020','EV',1),(209,2,1,'R019','HEAVY',1),(210,2,1,'R018','HEAVY',1),(211,2,1,'R017','HEAVY',1),(212,2,1,'R016','SCOOTER',1),(213,2,1,'R015','EV',1),(214,2,1,'R014','SCOOTER',1),(215,2,1,'R013','EV',1),(216,2,1,'R012','SCOOTER',1),(217,2,1,'R011','HEAVY',1),(218,2,1,'R010','SCOOTER',1),(219,2,1,'R009','SCOOTER',1),(220,2,1,'R008','FOUR_WHEELER',1),(221,2,1,'R007','FOUR_WHEELER',1),(222,2,1,'R006','HEAVY',1),(223,2,1,'R005','EV',1),(224,2,1,'R004','FOUR_WHEELER',1),(225,2,1,'R003','FOUR_WHEELER',1),(226,2,1,'R002','FOUR_WHEELER',1),(227,2,1,'R001','SCOOTER',1),(228,2,2,'R020','HEAVY',1),(229,2,2,'R019','EV',1),(230,2,2,'R018','FOUR_WHEELER',1),(231,2,2,'R017','SCOOTER',1),(232,2,2,'R016','FOUR_WHEELER',1),(233,2,2,'R015','HEAVY',1),(234,2,2,'R014','SCOOTER',1),(235,2,2,'R013','HEAVY',1),(236,2,2,'R012','FOUR_WHEELER',1),(237,2,2,'R011','SCOOTER',1),(238,2,2,'R010','EV',1),(239,2,2,'R009','SCOOTER',1),(240,2,2,'R008','SCOOTER',1),(241,2,2,'R007','EV',1),(242,2,2,'R006','FOUR_WHEELER',1),(243,2,2,'R005','HEAVY',1),(244,2,2,'R004','FOUR_WHEELER',1),(245,2,2,'R003','FOUR_WHEELER',1),(246,2,2,'R002','HEAVY',1),(247,2,2,'R001','EV',1),(248,3,0,'R020','FOUR_WHEELER',1),(249,3,0,'R019','HEAVY',1),(250,3,0,'R018','EV',1),(251,3,0,'R017','EV',1),(252,3,0,'R016','FOUR_WHEELER',1),(253,3,0,'R015','HEAVY',1),(254,3,0,'R014','EV',1),(255,3,0,'R013','FOUR_WHEELER',1),(256,3,0,'R012','HEAVY',1),(257,3,0,'R011','SCOOTER',1),(258,3,0,'R010','HEAVY',1),(259,3,0,'R009','SCOOTER',1),(260,3,0,'R008','HEAVY',1),(261,3,0,'R007','EV',1),(262,3,0,'R006','HEAVY',1),(263,3,0,'R005','EV',1),(264,3,0,'R004','HEAVY',1),(265,3,0,'R003','EV',1),(266,3,0,'R002','SCOOTER',1),(267,3,0,'R001','FOUR_WHEELER',1),(268,3,1,'R020','EV',1),(269,3,1,'R019','EV',1),(270,3,1,'R018','SCOOTER',1),(271,3,1,'R017','HEAVY',1),(272,3,1,'R016','SCOOTER',1),(273,3,1,'R015','FOUR_WHEELER',1),(274,3,1,'R014','FOUR_WHEELER',1),(275,3,1,'R013','EV',1),(276,3,1,'R012','EV',1),(277,3,1,'R011','HEAVY',1),(278,3,1,'R010','SCOOTER',1),(279,3,1,'R009','EV',1),(280,3,1,'R008','EV',1),(281,3,1,'R007','SCOOTER',1),(282,3,1,'R006','FOUR_WHEELER',1),(283,3,1,'R005','FOUR_WHEELER',1),(284,3,1,'R004','SCOOTER',1),(285,3,1,'R003','HEAVY',1),(286,3,1,'R002','FOUR_WHEELER',1),(287,3,1,'R001','HEAVY',1),(288,3,2,'R020','HEAVY',1),(289,3,2,'R019','EV',1),(290,3,2,'R018','SCOOTER',1),(291,3,2,'R017','EV',1),(292,3,2,'R016','HEAVY',1),(293,3,2,'R015','EV',1),(294,3,2,'R014','FOUR_WHEELER',1),(295,3,2,'R013','HEAVY',1),(296,3,2,'R012','SCOOTER',1),(297,3,2,'R011','EV',1),(298,3,2,'R010','EV',1),(299,3,2,'R009','FOUR_WHEELER',1),(300,3,2,'R008','HEAVY',1),(301,3,2,'R007','SCOOTER',1),(302,3,2,'R006','EV',1),(303,3,2,'R005','SCOOTER',1),(304,3,2,'R004','FOUR_WHEELER',1),(305,3,2,'R003','FOUR_WHEELER',1),(306,3,2,'R002','HEAVY',1),(307,3,2,'R001','HEAVY',1),(308,4,0,'R020','FOUR_WHEELER',1),(309,4,0,'R019','HEAVY',1),(310,4,0,'R018','EV',1),(311,4,0,'R017','FOUR_WHEELER',1),(312,4,0,'R016','SCOOTER',1),(313,4,0,'R015','SCOOTER',1),(314,4,0,'R014','FOUR_WHEELER',1),(315,4,0,'R013','HEAVY',1),(316,4,0,'R012','SCOOTER',1),(317,4,0,'R011','SCOOTER',1),(318,4,0,'R010','FOUR_WHEELER',1),(319,4,0,'R009','EV',1),(320,4,0,'R008','HEAVY',1),(321,4,0,'R007','EV',1),(322,4,0,'R006','SCOOTER',1),(323,4,0,'R005','HEAVY',1),(324,4,0,'R004','FOUR_WHEELER',1),(325,4,0,'R003','HEAVY',1),(326,4,0,'R002','SCOOTER',1),(327,4,0,'R001','HEAVY',1),(328,4,1,'R020','SCOOTER',1),(329,4,1,'R019','EV',1),(330,4,1,'R018','EV',1),(331,4,1,'R017','FOUR_WHEELER',1),(332,4,1,'R016','HEAVY',1),(333,4,1,'R015','HEAVY',1),(334,4,1,'R014','HEAVY',1),(335,4,1,'R013','FOUR_WHEELER',1),(336,4,1,'R012','SCOOTER',1),(337,4,1,'R011','HEAVY',1),(338,4,1,'R010','HEAVY',1),(339,4,1,'R009','EV',1),(340,4,1,'R008','SCOOTER',1),(341,4,1,'R007','EV',1),(342,4,1,'R006','HEAVY',1),(343,4,1,'R005','EV',1),(344,4,1,'R004','FOUR_WHEELER',1),(345,4,1,'R003','HEAVY',1),(346,4,1,'R002','FOUR_WHEELER',1),(347,4,1,'R001','HEAVY',1),(348,4,2,'R020','EV',1),(349,4,2,'R019','HEAVY',1),(350,4,2,'R018','SCOOTER',1),(351,4,2,'R017','EV',1),(352,4,2,'R016','EV',1),(353,4,2,'R015','FOUR_WHEELER',1),(354,4,2,'R014','EV',1),(355,4,2,'R013','EV',1),(356,4,2,'R012','HEAVY',1),(357,4,2,'R011','HEAVY',1),(358,4,2,'R010','FOUR_WHEELER',1),(359,4,2,'R009','HEAVY',1),(360,4,2,'R008','FOUR_WHEELER',1),(361,4,2,'R007','EV',1),(362,4,2,'R006','FOUR_WHEELER',1),(363,4,2,'R005','FOUR_WHEELER',1),(364,4,2,'R004','EV',1),(365,4,2,'R003','HEAVY',1),(366,4,2,'R002','SCOOTER',1),(367,4,2,'R001','HEAVY',1),(368,5,0,'R020','EV',1),(369,5,0,'R019','FOUR_WHEELER',1),(370,5,0,'R018','SCOOTER',1),(371,5,0,'R017','HEAVY',1),(372,5,0,'R016','EV',1),(373,5,0,'R015','FOUR_WHEELER',1),(374,5,0,'R014','SCOOTER',1),(375,5,0,'R013','SCOOTER',1),(376,5,0,'R012','HEAVY',1),(377,5,0,'R011','SCOOTER',1),(378,5,0,'R010','SCOOTER',1),(379,5,0,'R009','FOUR_WHEELER',1),(380,5,0,'R008','SCOOTER',1),(381,5,0,'R007','FOUR_WHEELER',1),(382,5,0,'R006','HEAVY',1),(383,5,0,'R005','HEAVY',1),(384,5,0,'R004','SCOOTER',1),(385,5,0,'R003','HEAVY',1),(386,5,0,'R002','SCOOTER',1),(387,5,0,'R001','FOUR_WHEELER',1),(388,5,1,'R020','SCOOTER',1),(389,5,1,'R019','HEAVY',1),(390,5,1,'R018','HEAVY',1),(391,5,1,'R017','HEAVY',1),(392,5,1,'R016','EV',1),(393,5,1,'R015','FOUR_WHEELER',1),(394,5,1,'R014','SCOOTER',1),(395,5,1,'R013','SCOOTER',1),(396,5,1,'R012','FOUR_WHEELER',1),(397,5,1,'R011','SCOOTER',1),(398,5,1,'R010','FOUR_WHEELER',1),(399,5,1,'R009','EV',1),(400,5,1,'R008','EV',1),(401,5,1,'R007','HEAVY',1),(402,5,1,'R006','FOUR_WHEELER',1),(403,5,1,'R005','HEAVY',1),(404,5,1,'R004','FOUR_WHEELER',1),(405,5,1,'R003','HEAVY',1),(406,5,1,'R002','SCOOTER',1),(407,5,1,'R001','HEAVY',1),(408,5,2,'R020','EV',1),(409,5,2,'R019','EV',1),(410,5,2,'R018','FOUR_WHEELER',1),(411,5,2,'R017','FOUR_WHEELER',1),(412,5,2,'R016','HEAVY',1),(413,5,2,'R015','EV',1),(414,5,2,'R014','EV',1),(415,5,2,'R013','HEAVY',1),(416,5,2,'R012','SCOOTER',1),(417,5,2,'R011','HEAVY',1),(418,5,2,'R010','FOUR_WHEELER',1),(419,5,2,'R009','HEAVY',1),(420,5,2,'R008','FOUR_WHEELER',1),(421,5,2,'R007','SCOOTER',1),(422,5,2,'R006','SCOOTER',1),(423,5,2,'R005','EV',1),(424,5,2,'R004','HEAVY',1),(425,5,2,'R003','SCOOTER',1),(426,5,2,'R002','FOUR_WHEELER',1),(427,5,2,'R001','FOUR_WHEELER',1),(428,6,0,'R020','EV',1),(429,6,0,'R019','FOUR_WHEELER',1),(430,6,0,'R018','FOUR_WHEELER',1),(431,6,0,'R017','SCOOTER',1),(432,6,0,'R016','SCOOTER',1),(433,6,0,'R015','SCOOTER',1),(434,6,0,'R014','SCOOTER',1),(435,6,0,'R013','SCOOTER',1),(436,6,0,'R012','EV',1),(437,6,0,'R011','FOUR_WHEELER',1),(438,6,0,'R010','HEAVY',1),(439,6,0,'R009','SCOOTER',1),(440,6,0,'R008','EV',1),(441,6,0,'R007','FOUR_WHEELER',1),(442,6,0,'R006','SCOOTER',1),(443,6,0,'R005','SCOOTER',1),(444,6,0,'R004','SCOOTER',1),(445,6,0,'R003','FOUR_WHEELER',1),(446,6,0,'R002','FOUR_WHEELER',1),(447,6,0,'R001','EV',1),(448,6,1,'R020','EV',1),(449,6,1,'R019','EV',1),(450,6,1,'R018','EV',1),(451,6,1,'R017','HEAVY',1),(452,6,1,'R016','HEAVY',1),(453,6,1,'R015','HEAVY',1),(454,6,1,'R014','HEAVY',1),(455,6,1,'R013','HEAVY',1),(456,6,1,'R012','EV',1),(457,6,1,'R011','HEAVY',1),(458,6,1,'R010','FOUR_WHEELER',1),(459,6,1,'R009','EV',1),(460,6,1,'R008','SCOOTER',1),(461,6,1,'R007','SCOOTER',1),(462,6,1,'R006','FOUR_WHEELER',1),(463,6,1,'R005','HEAVY',1),(464,6,1,'R004','HEAVY',1),(465,6,1,'R003','SCOOTER',1),(466,6,1,'R002','HEAVY',1),(467,6,1,'R001','SCOOTER',1),(468,6,2,'R020','FOUR_WHEELER',1),(469,6,2,'R019','SCOOTER',1),(470,6,2,'R018','HEAVY',1),(471,6,2,'R017','HEAVY',1),(472,6,2,'R016','FOUR_WHEELER',1),(473,6,2,'R015','FOUR_WHEELER',1),(474,6,2,'R014','SCOOTER',1),(475,6,2,'R013','EV',1),(476,6,2,'R012','EV',1),(477,6,2,'R011','FOUR_WHEELER',1),(478,6,2,'R010','EV',1),(479,6,2,'R009','EV',1),(480,6,2,'R008','SCOOTER',1),(481,6,2,'R007','EV',1),(482,6,2,'R006','FOUR_WHEELER',1),(483,6,2,'R005','FOUR_WHEELER',1),(484,6,2,'R004','HEAVY',1),(485,6,2,'R003','SCOOTER',1),(486,6,2,'R002','FOUR_WHEELER',1),(487,6,2,'R001','SCOOTER',1),(488,7,0,'R020','SCOOTER',1),(489,7,0,'R019','HEAVY',1),(490,7,0,'R018','HEAVY',1),(491,7,0,'R017','EV',1),(492,7,0,'R016','SCOOTER',1),(493,7,0,'R015','SCOOTER',1),(494,7,0,'R014','FOUR_WHEELER',1),(495,7,0,'R013','HEAVY',1),(496,7,0,'R012','EV',1),(497,7,0,'R011','FOUR_WHEELER',1),(498,7,0,'R010','HEAVY',1),(499,7,0,'R009','SCOOTER',1),(500,7,0,'R008','FOUR_WHEELER',1),(501,7,0,'R007','HEAVY',1),(502,7,0,'R006','SCOOTER',1),(503,7,0,'R005','SCOOTER',1),(504,7,0,'R004','FOUR_WHEELER',1),(505,7,0,'R003','HEAVY',1),(506,7,0,'R002','SCOOTER',1),(507,7,0,'R001','SCOOTER',1),(508,7,1,'R020','HEAVY',1),(509,7,1,'R019','FOUR_WHEELER',1),(510,7,1,'R018','SCOOTER',1),(511,7,1,'R017','SCOOTER',1),(512,7,1,'R016','EV',1),(513,7,1,'R015','HEAVY',1),(514,7,1,'R014','SCOOTER',1),(515,7,1,'R013','EV',1),(516,7,1,'R012','HEAVY',1),(517,7,1,'R011','SCOOTER',1),(518,7,1,'R010','FOUR_WHEELER',1),(519,7,1,'R009','HEAVY',1),(520,7,1,'R008','FOUR_WHEELER',1),(521,7,1,'R007','EV',1),(522,7,1,'R006','SCOOTER',1),(523,7,1,'R005','HEAVY',1),(524,7,1,'R004','HEAVY',1),(525,7,1,'R003','EV',1),(526,7,1,'R002','FOUR_WHEELER',1),(527,7,1,'R001','EV',1),(528,7,2,'R020','FOUR_WHEELER',1),(529,7,2,'R019','EV',1),(530,7,2,'R018','SCOOTER',1),(531,7,2,'R017','FOUR_WHEELER',1),(532,7,2,'R016','SCOOTER',1),(533,7,2,'R015','FOUR_WHEELER',1),(534,7,2,'R014','EV',1),(535,7,2,'R013','FOUR_WHEELER',1),(536,7,2,'R012','SCOOTER',1),(537,7,2,'R011','SCOOTER',1),(538,7,2,'R010','HEAVY',1),(539,7,2,'R009','HEAVY',1),(540,7,2,'R008','SCOOTER',1),(541,7,2,'R007','HEAVY',1),(542,7,2,'R006','SCOOTER',1),(543,7,2,'R005','EV',1),(544,7,2,'R004','HEAVY',1),(545,7,2,'R003','FOUR_WHEELER',1),(546,7,2,'R002','HEAVY',1),(547,7,2,'R001','EV',1),(548,8,0,'R020','FOUR_WHEELER',1),(549,8,0,'R019','SCOOTER',1),(550,8,0,'R018','SCOOTER',1),(551,8,0,'R017','HEAVY',1),(552,8,0,'R016','HEAVY',1),(553,8,0,'R015','EV',1),(554,8,0,'R014','EV',1),(555,8,0,'R013','SCOOTER',1),(556,8,0,'R012','HEAVY',1),(557,8,0,'R011','HEAVY',1),(558,8,0,'R010','SCOOTER',1),(559,8,0,'R009','SCOOTER',1),(560,8,0,'R008','SCOOTER',1),(561,8,0,'R007','FOUR_WHEELER',1),(562,8,0,'R006','EV',1),(563,8,0,'R005','EV',1),(564,8,0,'R004','SCOOTER',1),(565,8,0,'R003','FOUR_WHEELER',1),(566,8,0,'R002','SCOOTER',1),(567,8,0,'R001','HEAVY',1),(568,8,1,'R020','SCOOTER',1),(569,8,1,'R019','EV',1),(570,8,1,'R018','EV',1),(571,8,1,'R017','HEAVY',1),(572,8,1,'R016','HEAVY',1),(573,8,1,'R015','EV',1),(574,8,1,'R014','HEAVY',1),(575,8,1,'R013','EV',1),(576,8,1,'R012','EV',1),(577,8,1,'R011','EV',1),(578,8,1,'R010','SCOOTER',1),(579,8,1,'R009','EV',1),(580,8,1,'R008','FOUR_WHEELER',1),(581,8,1,'R007','FOUR_WHEELER',1),(582,8,1,'R006','EV',1),(583,8,1,'R005','HEAVY',1),(584,8,1,'R004','SCOOTER',1),(585,8,1,'R003','EV',1),(586,8,1,'R002','SCOOTER',1),(587,8,1,'R001','EV',1),(588,8,2,'R020','FOUR_WHEELER',1),(589,8,2,'R019','SCOOTER',1),(590,8,2,'R018','SCOOTER',1),(591,8,2,'R017','EV',1),(592,8,2,'R016','FOUR_WHEELER',1),(593,8,2,'R015','SCOOTER',1),(594,8,2,'R014','EV',1),(595,8,2,'R013','HEAVY',1),(596,8,2,'R012','HEAVY',1),(597,8,2,'R011','FOUR_WHEELER',1),(598,8,2,'R010','FOUR_WHEELER',1),(599,8,2,'R009','HEAVY',1),(600,8,2,'R008','EV',1),(601,8,2,'R007','HEAVY',1),(602,8,2,'R006','SCOOTER',1),(603,8,2,'R005','HEAVY',1),(604,8,2,'R004','SCOOTER',1),(605,8,2,'R003','SCOOTER',1),(606,8,2,'R002','SCOOTER',1),(607,8,2,'R001','EV',1);
/*!40000 ALTER TABLE `parking_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` int unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('UPI','CARD','CASH','NET_BANKING') DEFAULT NULL,
  `payment_status` enum('PENDING','SUCCESS','FAILED','REFUNDED') DEFAULT 'PENDING',
  `transaction_reference` varchar(100) DEFAULT NULL,
  `payment_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `payments_chk_1` CHECK ((`amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,100.00,'UPI','SUCCESS','PARKLINE-TXN-001','2026-11-03 07:17:11'),(2,2,150.00,NULL,'PENDING',NULL,'2026-11-03 08:31:04'),(3,3,50.00,NULL,'PENDING',NULL,'2026-11-03 12:54:11');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'hari_demo','hari@parkline.demo','DEMO_HASH_1','2026-11-03 07:13:43'),(2,'alex_demo','alex@parkline.demo','DEMO_HASH_2','2026-11-03 07:13:43'),(3,'Sreehari2255','soda@gmail.com','$2a$10$XXusj/O6oTGJlSsvcaorWu3RVjfMLDJ59qFLU09V4XjkMJ2Hhb5aC','2026-11-03 08:29:25'),(4,'nivedya2005','nivedya123@gmail.com','$2a$10$IUpTg/6JS8kCQW6uGQl9lOjsS/D2OVRcToOx8O8XEybGjFL5qn3HW','2026-11-03 12:51:56');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `vehicle_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `vehicle_number` varchar(20) NOT NULL,
  `rto` varchar(20) DEFAULT NULL,
  `vehicle_type` enum('EV','SCOOTER','FOUR_WHEELER','HEAVY') NOT NULL,
  `make` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,1,'KL13AB1234','KL13','FOUR_WHEELER','Hyundai','i20'),(2,1,'KL13CD5678','KL13','SCOOTER','Honda','Activa'),(3,2,'KL11EF9012','KL11','EV','Tata','Nexon EV'),(4,3,'KL 13 C 5543','KL13CNN','FOUR_WHEELER','Toyota','Innova Hycross'),(5,4,'KL 08 G 3212','THRISHUR','FOUR_WHEELER','Toyota','Fortuner');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-03 18:41:21
