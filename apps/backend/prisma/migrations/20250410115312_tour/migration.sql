/*
  Warnings:

  - A unique constraint covering the columns `[activeTourPlanid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeTourPlanid" TEXT,
ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "TourPlan" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "planData" JSONB NOT NULL,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TourPlanMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TourPlanMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TourPlanMembers_B_index" ON "_TourPlanMembers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "User_activeTourPlanid_key" ON "User"("activeTourPlanid");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeTourPlanid_fkey" FOREIGN KEY ("activeTourPlanid") REFERENCES "TourPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPlan" ADD CONSTRAINT "TourPlan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TourPlanMembers" ADD CONSTRAINT "_TourPlanMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "TourPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TourPlanMembers" ADD CONSTRAINT "_TourPlanMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
