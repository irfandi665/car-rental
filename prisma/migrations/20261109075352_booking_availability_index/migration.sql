-- CreateIndex
CREATE INDEX "Booking_status_startDate_endDate_idx" ON "Booking"("status", "startDate", "endDate");
