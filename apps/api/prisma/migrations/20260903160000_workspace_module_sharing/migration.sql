-- CreateTable
CREATE TABLE "workspace_memberships" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_memberships" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whiteboard_memberships" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whiteboard_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_memberships_userId_idx" ON "workspace_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_memberships_workspaceId_userId_key" ON "workspace_memberships"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "doc_memberships_userId_idx" ON "doc_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doc_memberships_docId_userId_key" ON "doc_memberships"("docId", "userId");

-- CreateIndex
CREATE INDEX "whiteboard_memberships_userId_idx" ON "whiteboard_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "whiteboard_memberships_whiteboardId_userId_key" ON "whiteboard_memberships"("whiteboardId", "userId");

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_memberships" ADD CONSTRAINT "doc_memberships_docId_fkey" FOREIGN KEY ("docId") REFERENCES "docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_memberships" ADD CONSTRAINT "doc_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_memberships" ADD CONSTRAINT "whiteboard_memberships_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_memberships" ADD CONSTRAINT "whiteboard_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

