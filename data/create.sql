CREATE TABLE "project" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL COLLATE BINARY,
  UNIQUE("name")
);

CREATE TABLE "project_history" (
  "project_id" INTEGER NOT NULL REFERENCES "project" ("id") ON DELETE CASCADE,
  "build_num" TEXT NOT NULL,
  "is_broken" INT DEFAULT 0,
  "is_aborted" INT DEFAULT 0,
  "is_stable" INT DEFAULT 0,
  "is_green" INT DEFAULT 0,
  "broken_since" TEXT,
  "timestamp" TIMESTAMP NOT NULL
);

CREATE TABLE "device" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "unique_id" TEXT NOT NULL,
  "registered" TIMESTAMP NOT NULL,
  UNIQUE("unique_id")
);

CREATE TABLE "device_setting" (
  "device_id" INTEGER NOT NULL REFERENCES "device" ("id") ON DELETE CASCADE,
  "setting_key" TEXT NOT NULL,
  "setting_value" BLOB,
  UNIQUE("device_id","setting_key") ON CONFLICT REPLACE
);

CREATE TABLE "device_subscription" (
  "device_id" INTEGER NOT NULL REFERENCES "device" ("id") ON DELETE CASCADE,
  "project_id" INTEGER NOT NULL REFERENCES "project" ("id") ON DELETE CASCADE,
  UNIQUE("device_id","project_id") ON CONFLICT REPLACE
);

CREATE TRIGGER "cleanup_project_history" BEFORE DELETE ON "project"
  FOR EACH ROW BEGIN
    DELETE FROM "project_history" WHERE "project_id" = OLD."id";
  END;
  
CREATE TRIGGER "cleanup_project_subscriptions" BEFORE DELETE ON "project"
  FOR EACH ROW BEGIN
    DELETE FROM "device_subscription" WHERE "project_id" = OLD."id";
  END;

CREATE TRIGGER "cleanup_device_setting" BEFORE DELETE ON "device"
  FOR EACH ROW BEGIN
    DELETE FROM "device_setting" WHERE "device_id" = OLD."id";
  END;

CREATE TRIGGER "cleanup_device_subscriptions" BEFORE DELETE ON "device"
  FOR EACH ROW BEGIN
    DELETE FROM "device_subscription" WHERE "device_id" = OLD."id";
  END;