/**
 * Модуль системы бэкапа
 * 
 * Обеспечивает создание ручных и автоматических бэкапов,
 * интеграцию с облачными сервисами без API-ключей
 */

class BackupManager {
    constructor() {
        this.lastCheck = null;
    }

    /**
     * Проверка необходимости автоматического бэкапа
     */
    async checkAutoBackup() {
        try {
            const backupSettings = this.getBackupSettings();
            if (!backupSettings.autoBackup) return;

            const now = new Date();
            const lastBackup = backupSettings.lastBackup ? 
                new Date(backupSettings.lastBackup) : null;

            let needBackup = false;

            if (!lastBackup) {
                needBackup = true;
            } else {
                const diffTime = now - lastBackup;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                switch (backupSettings.backupPeriod) {
                    case 'daily':
                        needBackup = diffDays >= 1;
                        break;
                    case 'weekly':
                        needBackup = diffDays >= 7;
                        break;
                    case 'monthly':
                        needBackup = diffDays >= 30;
                        break;
                }
            }

            if (needBackup) {
                await this.createAutoBackup(backupSettings.backupService);
            }
        } catch (error) {
            console.error('Ошибка проверки автобэкапа:', error);
        }
    }

    /**
     * Создание автоматического бэкапа
     */
    async createAutoBackup(service) {
        try {
            const backupData = this.generateBackupData();
            const result = await this.processBackup(backupData, service, true);

            if (result.success) {
                this.updateBackupHistory(service, 'success', result.size);
                console.log('Автоматический бэкап создан успешно');
            } else {
                this.updateBackupHistory(service, 'failed', 0);
                console.error('Ошибка автоматического бэкапа');
            }
        } catch (error) {
            console.error('Ошибка создания автобэкапа:', error);
            this.updateBackupHistory(service, 'failed', 0);
        }
    }

    /**
     * Создание ручного бэкапа
     */
    async createManualBackup(service) {
        try {
            const backupData = this.generateBackupData();
            const result = await this.processBackup(backupData, service, false);

            if (result.success) {
                this.updateBackupHistory(service, 'success', result.size);

                if (window.app) {
                    window.app.showSuccess('Бэкап создан успешно');
                }
            } else {
                if (window.app) {
                    window.app.showError('Ошибка создания бэкапа');
                }
            }
        } catch (error) {
            console.error('Ошибка ручного бэкапа:', error);
            if (window.app) {
                window.app.showError('Ошибка создания бэкапа');
            }
        }
    }

    /**
     * Генерация данных для бэкапа
     */
    generateBackupData() {
        const app = window.app;
        if (!app) {
            throw new Error('Приложение не инициализировано');
        }

        return {
            version: CONFIG.VERSION,
            timestamp: new Date().toISOString(),
            type: 'full_backup',
            data: {
                products: app.data.products,
                entries: app.data.entries,
                shifts: app.data.shifts,
                salary: app.data.salary,
                log: app.data.log.slice(-100), // Последние 100 записей
                presets: app.data.presets,
                theme: app.data.theme,
                backup: app.data.backup
            }
        };
    }

    /**
     * Обработка бэкапа в зависимости от сервиса
     */
    async processBackup(backupData, service, isAuto) {
        const jsonContent = JSON.stringify(backupData, null, 2);
        const filename = `uchet2-backup-${new Date().toISOString().split('T')[0]}.json`;
        const size = new Blob([jsonContent]).size;

        switch (service) {
            case 'email':
                return await this.backupToEmail(jsonContent, filename, isAuto);
            case 'yandex':
                return await this.backupToYandex(jsonContent, filename, isAuto);
            case 'google':
                return await this.backupToGoogle(jsonContent, filename, isAuto);
            default:
                throw new Error('Неизвестный сервис бэкапа');
        }
    }

    /**
     * Бэкап через email
     */
    async backupToEmail(content, filename, isAuto) {
        try {
            if (isAuto) {
                // Для автоматического бэкапа - скачиваем файл и показываем инструкцию
                this.downloadBackupFile(content, filename);
                this.showEmailInstruction(filename);
            } else {
                // Для ручного - открываем почтовый клиент
                const subject = 'Бэкап приложения Учёт продукции 2';
                const body = `Бэкап создан: ${new Date().toLocaleString()}\n\nВо вложении файл: ${filename}`;
                const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                // Скачиваем файл
                this.downloadBackupFile(content, filename);

                // Открываем почтовый клиент
                setTimeout(() => {
                    window.open(mailtoUrl, '_self');
                }, 500);
            }

            return { success: true, size: content.length };
        } catch (error) {
            console.error('Ошибка email бэкапа:', error);
            return { success: false, size: 0 };
        }
    }

    /**
     * Бэкап в Яндекс.Диск
     */
    async backupToYandex(content, filename, isAuto) {
        try {
            // Скачиваем файл локально
            this.downloadBackupFile(content, filename);

            // Показываем инструкцию
            const message = isAuto ? 
                `Автоматический бэкап готов!\n\nФайл ${filename} сохранён в папку загрузок.\n\nДля завершения бэкапа перетащите файл на disk.yandex.ru` :
                `Файл ${filename} готов к загрузке на Яндекс.Диск!`;

            if (window.app) {
                window.app.showSuccess(message);
            }

            // Для ручного бэкапа - открываем Яндекс.Диск
            if (!isAuto) {
                setTimeout(() => {
                    window.open('https://disk.yandex.ru', '_blank');
                }, 1000);
            }

            return { success: true, size: content.length };
        } catch (error) {
            console.error('Ошибка Яндекс.Диск бэкапа:', error);
            return { success: false, size: 0 };
        }
    }

    /**
     * Бэкап в Google Drive
     */
    async backupToGoogle(content, filename, isAuto) {
        try {
            // Скачиваем файл локально
            this.downloadBackupFile(content, filename);

            // Показываем инструкцию
            const message = isAuto ? 
                `Автоматический бэкап готов!\n\nФайл ${filename} сохранён в папку загрузок.\n\nДля завершения бэкапа перетащите файл на drive.google.com` :
                `Файл ${filename} готов к загрузке на Google Drive!`;

            if (window.app) {
                window.app.showSuccess(message);
            }

            // Для ручного бэкапа - открываем Google Drive
            if (!isAuto) {
                setTimeout(() => {
                    window.open('https://drive.google.com', '_blank');
                }, 1000);
            }

            return { success: true, size: content.length };
        } catch (error) {
            console.error('Ошибка Google Drive бэкапа:', error);
            return { success: false, size: 0 };
        }
    }

    /**
     * Скачивание файла бэкапа
     */
    downloadBackupFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Показ инструкции для email бэкапа
     */
    showEmailInstruction(filename) {
        const message = `Автоматический бэкап готов!\n\nФайл ${filename} сохранён в папку загрузок.\n\nДля завершения бэкапа:
1. Найдите файл в папке загрузок
2. Прикрепите к письму
3. Отправьте себе на email`;

        if (window.app) {
            window.app.showSuccess(message);
        }
    }

    /**
     * Получение настроек бэкапа
     */
    getBackupSettings() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.BACKUP);
            return stored ? JSON.parse(stored) : CONFIG.DEFAULT_DATA.backup;
        } catch (error) {
            console.error('Ошибка загрузки настроек бэкапа:', error);
            return CONFIG.DEFAULT_DATA.backup;
        }
    }

    /**
     * Сохранение настроек бэкапа
     */
    saveBackupSettings(settings) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.BACKUP, JSON.stringify(settings));
        } catch (error) {
            console.error('Ошибка сохранения настроек бэкапа:', error);
        }
    }

    /**
     * Обновление истории бэкапов
     */
    updateBackupHistory(service, status, size) {
        try {
            const settings = this.getBackupSettings();

            // Обновляем дату последнего бэкапа при успехе
            if (status === 'success') {
                settings.lastBackup = new Date().toISOString();
            }

            // Добавляем запись в историю
            if (!settings.backupHistory) {
                settings.backupHistory = [];
            }

            settings.backupHistory.push({
                date: new Date().toISOString(),
                service: service,
                status: status,
                size: size
            });

            // Ограничиваем размер истории
            if (settings.backupHistory.length > 50) {
                settings.backupHistory = settings.backupHistory.slice(-50);
            }

            this.saveBackupSettings(settings);

            // Обновляем данные в приложении
            if (window.app) {
                window.app.data.backup = settings;
                window.app.saveData();
            }
        } catch (error) {
            console.error('Ошибка обновления истории бэкапов:', error);
        }
    }

    /**
     * Получение истории бэкапов
     */
    getBackupHistory() {
        const settings = this.getBackupSettings();
        return settings.backupHistory || [];
    }

    /**
     * Форматирование размера файла
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';

        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Очистка старых бэкапов
     */
    cleanOldBackups(daysToKeep = 30) {
        try {
            const settings = this.getBackupSettings();
            if (!settings.backupHistory) return;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            settings.backupHistory = settings.backupHistory.filter(backup => 
                new Date(backup.date) >= cutoffDate
            );

            this.saveBackupSettings(settings);
        } catch (error) {
            console.error('Ошибка очистки старых бэкапов:', error);
        }
    }
}