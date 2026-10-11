-- ======================================================
-- College Club Management System Database Schema & Data
-- ======================================================

CREATE DATABASE IF NOT EXISTS `college_clubs`;
USE `college_clubs`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'club_admin', 'super_admin') DEFAULT 'student',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Clubs Table
CREATE TABLE IF NOT EXISTS `clubs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `category` VARCHAR(50) DEFAULT 'General',
  `admin_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Memberships Table
CREATE TABLE IF NOT EXISTS `memberships` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `club_id` INT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_membership` (`user_id`, `club_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Announcements Table
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `club_id` INT NOT NULL,
  `created_by` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Events Table
CREATE TABLE IF NOT EXISTS `eventss` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `club_id` INT NOT NULL,
  `created_by` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `venue` VARCHAR(200) DEFAULT NULL,
  `event_date` DATETIME DEFAULT NULL,
  `registration_open` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Seed Data
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Super Admin', 'super@college.com', '123456', 'super_admin'),
(2, 'Tech Club Admin', 'techadmin@college.com', '123456', 'club_admin'),
(3, 'Alice Johnson', 'alice@college.com', '123456', 'student'),
(4, 'Bob Smith', 'bob@college.com', '123456', 'student');

INSERT IGNORE INTO `clubs` (`id`, `name`, `description`, `category`, `admin_id`, `is_active`) VALUES
(1, 'Tech Club', 'For coding and innovation enthusiasts', 'Technology', 2, 1),
(2, 'Cultural Club', 'Dance, music and cultural activities', 'Cultural', 2, 1),
(3, 'Sports Club', 'All sports activities and tournaments', 'Sports', 2, 1);

INSERT IGNORE INTO `memberships` (`id`, `user_id`, `club_id`, `status`) VALUES
(1, 3, 1, 'approved'),
(2, 4, 1, 'approved'),
(3, 3, 2, 'approved');

INSERT IGNORE INTO `announcements` (`id`, `club_id`, `created_by`, `title`, `body`) VALUES
(1, 1, 2, 'Hackathon Registration Open', 'Registrations for Hackathon 2026 are now open. Limited seats available. Register before March 10.'),
(2, 1, 2, 'Weekly Tech Meetup', 'Our weekly coding meetup will be held this Friday at 4 PM in Lab 3.'),
(3, 2, 2, 'Cultural Fest Auditions', 'Auditions for dance and music performances will begin from April 1.'),
(4, 3, 2, 'Football Team Selection', 'Selections for the inter-college football team will take place next Monday at 7 AM.');

INSERT IGNORE INTO `eventss` (`id`, `club_id`, `created_by`, `title`, `venue`, `event_date`, `registration_open`) VALUES
(1, 1, 2, 'Hackathon 2026', 'Main Auditorium', '2026-03-15 09:00:00', 1),
(2, 2, 2, 'Cultural Fest 2026', 'Open Ground Stage', '2026-04-10 17:00:00', 1),
(3, 3, 2, 'Football Tournament', 'College Sports Complex', '2026-05-05 08:00:00', 0),
(4, 1, 2, 'AI Workshop', 'Lab 3 - Tech Block', '2026-03-20 10:30:00', 1);
