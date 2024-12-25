CREATE TABLE `secrets` (
	`name` text NOT NULL,
	`value` text NOT NULL,
	`environment` text NOT NULL,
	PRIMARY KEY(`name`, `environment`)
);
