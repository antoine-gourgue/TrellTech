-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "trelloToken" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

