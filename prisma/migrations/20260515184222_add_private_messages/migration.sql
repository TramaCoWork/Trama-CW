-- CreateTable
CREATE TABLE "private_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "deleted_by_sender" BOOLEAN NOT NULL DEFAULT false,
    "deleted_by_receiver" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "private_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_messages_sender_receiver_sent_at" ON "private_messages"("sender_id", "receiver_id", "sent_at");

-- AddForeignKey
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
