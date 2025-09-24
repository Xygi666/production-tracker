/**
 * Модуль расчёта рабочих часов по графику
 * 
 * Поддерживает графики 2/2 и 5/2, автоматический расчёт
 * отработанных часов и переработок
 */

class WorkScheduleManager {
    constructor() {
        this.settings = null;
        this.loadSettings();
    }

    /**
     * Загрузка настроек графика
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SALARY);
            this.settings = stored ? JSON.parse(stored) : CONFIG.DEFAULT_DATA.salary;
        } catch (error) {
            console.error('Ошибка загрузки настроек графика:', error);
            this.settings = CONFIG.DEFAULT_DATA.salary;
        }
    }

    /**
     * Обновление настроек графика
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Расчёт часов за месяц
     */
    calculateMonthHours(year, month) {
        try {
            // Получаем ручные смены
            const manualHours = this.getManualShiftHours(year, month);

            // Получаем автоматически рассчитанные часы
            const autoHours = this.calculateAutoHours(year, month);

            return manualHours + autoHours;
        } catch (error) {
            console.error('Ошибка расчёта часов за месяц:', error);
            return 0;
        }
    }

    /**
     * Получение часов из ручных смен
     */
    getManualShiftHours(year, month) {
        try {
            const shifts = this.getShifts();
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            let totalHours = 0;

            shifts.forEach(shift => {
                const shiftDate = new Date(shift.date);
                if (shiftDate >= startDate && shiftDate <= endDate && !shift.auto) {
                    totalHours += shift.hours || 0;
                }
            });

            return totalHours;
        } catch (error) {
            console.error('Ошибка получения ручных смен:', error);
            return 0;
        }
    }

    /**
     * Автоматический расчёт часов по графику
     */
    calculateAutoHours(year, month) {
        if (!this.settings) return 0;

        const schedule = this.settings.workSchedule;
        const hoursPerShift = this.settings.hoursPerShift || 8;

        switch (schedule) {
            case '2/2':
                return this.calculate2x2Schedule(year, month, hoursPerShift);
            case '5/2':
                return this.calculate5x2Schedule(year, month, hoursPerShift);
            default:
                return 0;
        }
    }

    /**
     * Расчёт для графика 2/2
     */
    calculate2x2Schedule(year, month, hoursPerShift) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const scheduleStart = new Date(this.settings.scheduleStartDate);

            let workingDays = 0;
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                // Рассчитываем количество дней от начала графика
                const daysDiff = Math.floor((currentDate - scheduleStart) / (1000 * 60 * 60 * 24));

                // В графике 2/2: первые 2 дня работаем, следующие 2 дня отдыхаем
                const cyclePosition = daysDiff % 4;

                if (cyclePosition >= 0 && cyclePosition < 2) {
                    // Проверяем, нет ли ручной смены на этот день
                    if (!this.hasManualShift(currentDate)) {
                        workingDays++;
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return workingDays * hoursPerShift;
        } catch (error) {
            console.error('Ошибка расчёта графика 2/2:', error);
            return 0;
        }
    }

    /**
     * Расчёт для графика 5/2
     */
    calculate5x2Schedule(year, month, hoursPerShift) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            let workingDays = 0;
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();

                // 5/2: работаем пн-пт (1-5), выходные сб-вс (0, 6)
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    // Проверяем, нет ли ручной смены на этот день
                    if (!this.hasManualShift(currentDate)) {
                        workingDays++;
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return workingDays * hoursPerShift;
        } catch (error) {
            console.error('Ошибка расчёта графика 5/2:', error);
            return 0;
        }
    }

    /**
     * Проверка наличия ручной смены на дату
     */
    hasManualShift(date) {
        const shifts = this.getShifts();
        const dateStr = date.toISOString().split('T')[0];

        return shifts.some(shift => 
            shift.date === dateStr && !shift.auto
        );
    }

    /**
     * Получение смен из localStorage
     */
    getShifts() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SHIFTS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Ошибка загрузки смен:', error);
            return [];
        }
    }

    /**
     * Добавление ручной смены
     */
    addManualShift(date, hours, type = 'work', comment = '') {
        try {
            const shifts = this.getShifts();
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

            // Проверяем, нет ли уже смены на эту дату
            const existingIndex = shifts.findIndex(shift => shift.date === dateStr);

            const shift = {
                id: Date.now(),
                date: dateStr,
                hours: parseFloat(hours) || 0,
                type: type,
                comment: comment.trim(),
                auto: false
            };

            if (existingIndex >= 0) {
                shifts[existingIndex] = shift;
            } else {
                shifts.push(shift);
            }

            this.saveShifts(shifts);

            // Логирование
            if (window.app) {
                const snapshot = window.app.createSnapshot();
                window.app.addToLog('add_shift', shift, 
                    `${existingIndex >= 0 ? 'Изменена' : 'Добавлена'} смена: ${dateStr} (${hours}ч)`, 
                    snapshot);
            }

            return shift;
        } catch (error) {
            console.error('Ошибка добавления смены:', error);
            return null;
        }
    }

    /**
     * Удаление ручной смены
     */
    removeManualShift(date) {
        try {
            const shifts = this.getShifts();
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

            const shiftIndex = shifts.findIndex(shift => 
                shift.date === dateStr && !shift.auto
            );

            if (shiftIndex >= 0) {
                const removedShift = shifts[shiftIndex];
                shifts.splice(shiftIndex, 1);
                this.saveShifts(shifts);

                // Логирование
                if (window.app) {
                    const snapshot = window.app.createSnapshot();
                    window.app.addToLog('delete_shift', removedShift, 
                        `Удалена смена: ${dateStr}`, snapshot);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Ошибка удаления смены:', error);
            return false;
        }
    }

    /**
     * Сохранение смен
     */
    saveShifts(shifts) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));

            // Обновляем данные в приложении
            if (window.app) {
                window.app.data.shifts = shifts;
            }
        } catch (error) {
            console.error('Ошибка сохранения смен:', error);
        }
    }

    /**
     * Получение рабочих дней месяца по графику
     */
    getWorkDaysInMonth(year, month) {
        const schedule = this.settings.workSchedule;

        switch (schedule) {
            case '2/2':
                return this.getWorkDays2x2(year, month);
            case '5/2':
                return this.getWorkDays5x2(year, month);
            default:
                return [];
        }
    }

    /**
     * Получение рабочих дней для графика 2/2
     */
    getWorkDays2x2(year, month) {
        const workDays = [];
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const scheduleStart = new Date(this.settings.scheduleStartDate);

        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const daysDiff = Math.floor((currentDate - scheduleStart) / (1000 * 60 * 60 * 24));
            const cyclePosition = daysDiff % 4;

            if (cyclePosition >= 0 && cyclePosition < 2) {
                workDays.push(new Date(currentDate));
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return workDays;
    }

    /**
     * Получение рабочих дней для графика 5/2
     */
    getWorkDays5x2(year, month) {
        const workDays = [];
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workDays.push(new Date(currentDate));
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return workDays;
    }

    /**
     * Расчёт переработок
     */
    calculateOvertime(year, month) {
        const totalWorked = this.calculateMonthHours(year, month);
        const normHours = this.settings.normHoursPerMonth || 168;

        return Math.max(0, totalWorked - normHours);
    }

    /**
     * Получение статистики по месяцу
     */
    getMonthStatistics(year, month) {
        return {
            totalHours: this.calculateMonthHours(year, month),
            manualHours: this.getManualShiftHours(year, month),
            autoHours: this.calculateAutoHours(year, month),
            normHours: this.settings.normHoursPerMonth || 168,
            overtime: this.calculateOvertime(year, month),
            workDays: this.getWorkDaysInMonth(year, month).length,
            schedule: this.settings.workSchedule,
            hoursPerShift: this.settings.hoursPerShift
        };
    }
}