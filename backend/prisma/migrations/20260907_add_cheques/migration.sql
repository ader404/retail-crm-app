-- CreateTable
CREATE TABLE `cheques` (
    `id` VARCHAR(191) NOT NULL,
    `chequeNumber` VARCHAR(100) NOT NULL,
    `type` ENUM('INCOMING', 'OUTGOING') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `issueDate` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `bankName` VARCHAR(200) NULL,
    `accountReference` VARCHAR(200) NULL,
    `status` ENUM('PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `partyName` VARCHAR(200) NULL,
    `customerId` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `saleId` VARCHAR(191) NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `clearedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cheques_chequeNumber_idx`(`chequeNumber`),
    INDEX `cheques_type_idx`(`type`),
    INDEX `cheques_status_idx`(`status`),
    INDEX `cheques_dueDate_idx`(`dueDate`),
    INDEX `cheques_customerId_idx`(`customerId`),
    INDEX `cheques_supplierId_idx`(`supplierId`),
    INDEX `cheques_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cheque_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `chequeId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED') NULL,
    `newStatus` ENUM('PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED') NOT NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cheque_status_history_chequeId_idx`(`chequeId`),
    INDEX `cheque_status_history_changedBy_idx`(`changedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheque_status_history` ADD CONSTRAINT `cheque_status_history_chequeId_fkey` FOREIGN KEY (`chequeId`) REFERENCES `cheques`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheque_status_history` ADD CONSTRAINT `cheque_status_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
