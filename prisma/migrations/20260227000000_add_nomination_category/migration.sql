-- AlterTable: Add category column and composite unique for nomination types
-- (Board of Director, Secretary, Treasurer, Audit Committee, Election Committee)
--
-- If this fails with "Duplicate column" or "check that column/key exists",
-- your DB may already be updated via `prisma db push`. Run:
--   npx prisma migrate resolve --applied 20260227000000_add_nomination_category

-- Step 1: Drop old unique on name
DROP INDEX `candidates_name_key` ON `candidates`;

-- Step 2: Add category column
ALTER TABLE `candidates` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'board_of_director';

-- Step 3: Add composite unique on (name, category)
CREATE UNIQUE INDEX `candidates_name_category_key` ON `candidates`(`name`, `category`);
