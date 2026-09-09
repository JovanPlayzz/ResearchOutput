ALTER TABLE `classrooms` ADD `semester` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `classrooms` ADD `school_year` text;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `classrooms` SET `semester` = 2 WHERE `school_id` IN (SELECT `id` FROM `schools` WHERE `current_quarter` >= 3);
