/**
 * Учёт продукции 2 - Основное приложение
 * 
 * Модульная архитектура SPA приложения для учёта произведённой продукции
 * с расчётом зарплаты, статистикой и системой бэкапа
 */

// =============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// =============================================================================

const CONFIG = {
    VERSION: '3.0.0',
    STORAGE_PREFIX: 'pt_',
    STORAGE_VERSION: 'v3',
    MAX_RECORDS: 10000,
    DEFAULT_CURRENCY: '₽',
    DATE_FORMAT: 'ru-RU',

    // Ключи хранилища
    STORAGE_KEYS: {
        PRODUCTS: 'pt_products_v3',
        ENTRIES: 'pt_entries_v3',
        SHIFTS: 'pt_shifts_v3',
        SALARY: 'pt_salary_v3',
        THEME: 'pt_theme_v3',
        LOG: 'pt_log_v3',
        PRESETS: 'pt_presets_v3',
        BACKUP: 'pt_backup_v3',
        SETTINGS: 'pt_settings_v3'
    },

    // Данные по умолчанию
    DEFAULT_DATA: {
        products: [
            {id: 1, name: "Изделие А", price: 100, archived: false, created: new Date().toISOString()},
            {id: 2, name: "Изделие Б", price: 150, archived: false, created: new Date().toISOString()},
            {id: 3, name: "Изделие В", price: 200, archived: false, created: new Date().toISOString()}
        ],
        salary: {
            baseSalary: 50000,
            taxRate: 13,
            advanceAmount: 20000,
            workSchedule: "2/2",
            hoursPerShift: 12,
            scheduleStartDate: "2025-09-01",
            normHoursPerMonth: 168
        },
        presets: [1, 5, 10, 25, 50],
        theme: 'classic',
        backup: {
            autoBackup: false,
            backupPeriod: 'weekly',
            backupService: 'email',
            lastBackup: null,
            backupHistory: []
        }
    }
};

// =============================================================================
// ОСНОВНОЙ КЛАСС ПРИЛОЖЕНИЯ
// =============================================================================

class ProductionAccountingApp {
    constructor() {
        this.currentScreen = 'records';
        this.data = {
            products: [],
            entries: [],
            shifts: [],
            salary: {},
            log: [],
            presets: [],
            theme: 'classic',
            backup: {}
        };

        this.elements = {};
        this.workSchedule = null;
        this.backup = null;

        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            console.log('Инициализация приложения...');

            // Инициализация модулей
            this.workSchedule = new WorkScheduleManager();
            this.backup = new BackupManager();

            // Загрузка данных
            this.loadData();

            // Инициализация UI
            this.initializeElements();
            this.setupEventListeners();

            // Применение темы
            this.applyTheme(this.data.theme);

            // Отрисовка интерфейса
            this.renderProducts();
            this.renderPresets();
            this.renderRecords();
            this.renderStatistics();
            this.renderHistory();

            // Проверка автоматического бэкапа
            await this.backup.checkAutoBackup();

            console.log('Приложение инициализировано');
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Ошибка инициализации приложения');
        }
    }

    /**
     * Загрузка данных из localStorage
     */
    loadData() {
        // Загрузка продуктов
        const storedProducts = localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTS);
        this.data.products = storedProducts ? 
            JSON.parse(storedProducts) : CONFIG.DEFAULT_DATA.products;

        // Загрузка записей
        const storedEntries = localStorage.getItem(CONFIG.STORAGE_KEYS.ENTRIES);
        this.data.entries = storedEntries ? JSON.parse(storedEntries) : [];

        // Загрузка смен
        const storedShifts = localStorage.getItem(CONFIG.STORAGE_KEYS.SHIFTS);
        this.data.shifts = storedShifts ? JSON.parse(storedShifts) : [];

        // Загрузка зарплаты
        const storedSalary = localStorage.getItem(CONFIG.STORAGE_KEYS.SALARY);
        this.data.salary = storedSalary ? 
            JSON.parse(storedSalary) : CONFIG.DEFAULT_DATA.salary;

        // Загрузка журнала
        const storedLog = localStorage.getItem(CONFIG.STORAGE_KEYS.LOG);
        this.data.log = storedLog ? JSON.parse(storedLog) : [];

        // Загрузка пресетов
        const storedPresets = localStorage.getItem(CONFIG.STORAGE_KEYS.PRESETS);
        this.data.presets = storedPresets ? 
            JSON.parse(storedPresets) : CONFIG.DEFAULT_DATA.presets;

        // Загрузка темы
        this.data.theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 
            CONFIG.DEFAULT_DATA.theme;

        // Загрузка настроек бэкапа
        const storedBackup = localStorage.getItem(CONFIG.STORAGE_KEYS.BACKUP);
        this.data.backup = storedBackup ? 
            JSON.parse(storedBackup) : CONFIG.DEFAULT_DATA.backup;
    }

    /**
     * Сохранение данных в localStorage
     */
    saveData() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTS, 
                JSON.stringify(this.data.products));
            localStorage.setItem(CONFIG.STORAGE_KEYS.ENTRIES, 
                JSON.stringify(this.data.entries));
            localStorage.setItem(CONFIG.STORAGE_KEYS.SHIFTS, 
                JSON.stringify(this.data.shifts));
            localStorage.setItem(CONFIG.STORAGE_KEYS.SALARY, 
                JSON.stringify(this.data.salary));
            localStorage.setItem(CONFIG.STORAGE_KEYS.LOG, 
                JSON.stringify(this.data.log));
            localStorage.setItem(CONFIG.STORAGE_KEYS.PRESETS, 
                JSON.stringify(this.data.presets));
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, this.data.theme);
            localStorage.setItem(CONFIG.STORAGE_KEYS.BACKUP, 
                JSON.stringify(this.data.backup));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            this.showError('Ошибка сохранения данных');
        }
    }

    /**
     * Инициализация элементов DOM
     */
    initializeElements() {
        // Навигация
        this.elements.navTabs = document.querySelectorAll('.nav__tab');
        this.elements.screens = document.querySelectorAll('.screen');

        // Главный экран
        this.elements.productSelect = document.getElementById('productSelect');
        this.elements.quantityInput = document.getElementById('quantityInput');
        this.elements.decreaseBtn = document.getElementById('decreaseBtn');
        this.elements.increaseBtn = document.getElementById('increaseBtn');
        this.elements.presetsContainer = document.getElementById('presetsContainer');
        this.elements.sumAmount = document.getElementById('sumAmount');
        this.elements.addRecordBtn = document.getElementById('addRecordBtn');
        this.elements.recordsList = document.getElementById('recordsList');
        this.elements.todayCount = document.getElementById('todayCount');
        this.elements.monthSum = document.getElementById('monthSum');
        this.elements.exportCsvBtn = document.getElementById('exportCsvBtn');

        // Статистика
        this.elements.statsGrid = document.getElementById('statsGrid');

        // История
        this.elements.filterDate = document.getElementById('filterDate');
        this.elements.filterAction = document.getElementById('filterAction');
        this.elements.historyList = document.getElementById('historyList');
        this.elements.exportHistoryBtn = document.getElementById('exportHistoryBtn');

        // Кнопки в шапке
        this.elements.settingsBtn = document.getElementById('settingsBtn');
        this.elements.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.elements.reloadBtn = document.getElementById('reloadBtn');

        // Модальное окно настроек
        this.elements.settingsModal = document.getElementById('settingsModal');
        this.elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.elements.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

        // Вкладки настроек
        this.elements.settingsTabs = document.querySelectorAll('.settings-tab');
        this.elements.settingsPanels = document.querySelectorAll('.settings-panel');

        // Поля настроек зарплаты
        this.elements.baseSalary = document.getElementById('baseSalary');
        this.elements.taxRate = document.getElementById('taxRate');
        this.elements.advanceAmount = document.getElementById('advanceAmount');
        this.elements.workSchedule = document.getElementById('workSchedule');
        this.elements.hoursPerShift = document.getElementById('hoursPerShift');
        this.elements.scheduleStartDate = document.getElementById('scheduleStartDate');
        this.elements.normHoursPerMonth = document.getElementById('normHoursPerMonth');

        // Продукты
        this.elements.addProductBtn = document.getElementById('addProductBtn');
        this.elements.importProductsBtn = document.getElementById('importProductsBtn');
        this.elements.importProductsFile = document.getElementById('importProductsFile');
        this.elements.productsList = document.getElementById('productsList');

        // Общие настройки
        this.elements.themeSelect = document.getElementById('themeSelect');
        this.elements.presetsInput = document.getElementById('presetsInput');

        // Бэкап
        this.elements.emailBackupBtn = document.getElementById('emailBackupBtn');
        this.elements.yandexBackupBtn = document.getElementById('yandexBackupBtn');
        this.elements.googleBackupBtn = document.getElementById('googleBackupBtn');
        this.elements.autoBackupEnabled = document.getElementById('autoBackupEnabled');
        this.elements.backupPeriod = document.getElementById('backupPeriod');
        this.elements.backupService = document.getElementById('backupService');
        this.elements.restoreBackupBtn = document.getElementById('restoreBackupBtn');
        this.elements.restoreBackupFile = document.getElementById('restoreBackupFile');
        this.elements.backupHistoryList = document.getElementById('backupHistoryList');

        // Модальное окно подтверждения
        this.elements.confirmModal = document.getElementById('confirmModal');
        this.elements.confirmTitle = document.getElementById('confirmTitle');
        this.elements.confirmMessage = document.getElementById('confirmMessage');
        this.elements.confirmYesBtn = document.getElementById('confirmYesBtn');
        this.elements.confirmNoBtn = document.getElementById('confirmNoBtn');
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Навигация
        this.elements.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetScreen = e.target.dataset.tab;
                this.switchScreen(targetScreen);
            });
        });

        // Главный экран
        this.elements.productSelect.addEventListener('change', () => {
            this.calculateSum();
        });

        this.elements.quantityInput.addEventListener('input', () => {
            this.calculateSum();
        });

        this.elements.decreaseBtn.addEventListener('click', () => {
            const current = parseFloat(this.elements.quantityInput.value) || 0;
            const step = parseFloat(this.elements.quantityInput.step) || 1;
            const min = parseFloat(this.elements.quantityInput.min) || 0.01;
            const newValue = Math.max(min, current - step);
            this.elements.quantityInput.value = newValue;
            this.calculateSum();
        });

        this.elements.increaseBtn.addEventListener('click', () => {
            const current = parseFloat(this.elements.quantityInput.value) || 0;
            const step = parseFloat(this.elements.quantityInput.step) || 1;
            const newValue = current + step;
            this.elements.quantityInput.value = newValue;
            this.calculateSum();
        });

        this.elements.addRecordBtn.addEventListener('click', () => {
            this.addRecord();
        });

        this.elements.exportCsvBtn.addEventListener('click', () => {
            this.exportCsv();
        });

        // История
        this.elements.filterDate.addEventListener('change', () => {
            this.renderHistory();
        });

        this.elements.filterAction.addEventListener('change', () => {
            this.renderHistory();
        });

        this.elements.exportHistoryBtn.addEventListener('click', () => {
            this.exportHistory();
        });

        // Кнопки в шапке
        this.elements.settingsBtn.addEventListener('click', () => {
            this.openSettingsModal();
        });

        this.elements.exportJsonBtn.addEventListener('click', () => {
            this.exportJson();
        });

        this.elements.reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });

        // Настройки
        this.setupSettingsEventListeners();
    }

    /**
     * Настройка обработчиков для модального окна настроек
     */
    setupSettingsEventListeners() {
        // Открытие/закрытие модального окна
        this.elements.closeSettingsBtn.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        this.elements.cancelSettingsBtn.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        this.elements.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Закрытие по клику на подложку
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal || 
                e.target.classList.contains('modal__backdrop')) {
                this.closeSettingsModal();
            }
        });

        // Переключение вкладок настроек
        this.elements.settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetPanel = e.target.dataset.tab;
                this.switchSettingsPanel(targetPanel);
            });
        });

        // Продукты
        this.elements.addProductBtn.addEventListener('click', () => {
            this.addProduct();
        });

        this.elements.importProductsBtn.addEventListener('click', () => {
            this.elements.importProductsFile.click();
        });

        this.elements.importProductsFile.addEventListener('change', (e) => {
            this.importProducts(e.target.files[0]);
        });

        // Бэкап
        this.elements.emailBackupBtn.addEventListener('click', () => {
            this.backup.createManualBackup('email');
        });

        this.elements.yandexBackupBtn.addEventListener('click', () => {
            this.backup.createManualBackup('yandex');
        });

        this.elements.googleBackupBtn.addEventListener('click', () => {
            this.backup.createManualBackup('google');
        });

        this.elements.restoreBackupBtn.addEventListener('click', () => {
            this.elements.restoreBackupFile.click();
        });

        this.elements.restoreBackupFile.addEventListener('change', (e) => {
            this.restoreBackup(e.target.files[0]);
        });
    }

    /**
     * Переключение экранов
     */
    switchScreen(screenName) {
        // Обновляем активную вкладку
        this.elements.navTabs.forEach(tab => {
            tab.classList.remove('nav__tab--active');
            if (tab.dataset.tab === screenName) {
                tab.classList.add('nav__tab--active');
            }
        });

        // Обновляем активный экран
        this.elements.screens.forEach(screen => {
            screen.classList.remove('screen--active');
            if (screen.dataset.screen === screenName) {
                screen.classList.add('screen--active');
            }
        });

        this.currentScreen = screenName;

        // Обновляем данные при переходе
        switch (screenName) {
            case 'records':
                this.renderRecords();
                break;
            case 'statistics':
                this.renderStatistics();
                break;
            case 'history':
                this.renderHistory();
                break;
        }
    }

    /**
     * Переключение панелей настроек
     */
    switchSettingsPanel(panelName) {
        this.elements.settingsTabs.forEach(tab => {
            tab.classList.remove('settings-tab--active');
            if (tab.dataset.tab === panelName) {
                tab.classList.add('settings-tab--active');
            }
        });

        this.elements.settingsPanels.forEach(panel => {
            panel.classList.remove('settings-panel--active');
            if (panel.dataset.panel === panelName) {
                panel.classList.add('settings-panel--active');
            }
        });
    }

    /**
     * Применение темы
     */
    applyTheme(theme) {
        document.body.dataset.theme = theme;
        this.data.theme = theme;
        this.saveData();
    }

    /**
     * Отрисовка списка продуктов
     */
    renderProducts() {
        // Очистка списка
        this.elements.productSelect.innerHTML = '<option value="">Выберите продукт</option>';

        // Добавление активных продуктов
        const activeProducts = this.data.products.filter(p => !p.archived);
        activeProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - ${product.price}${CONFIG.DEFAULT_CURRENCY}`;
            this.elements.productSelect.appendChild(option);
        });

        // Отрисовка списка в настройках
        this.renderProductsList();
    }

    /**
     * Отрисовка списка продуктов в настройках
     */
    renderProductsList() {
        if (!this.elements.productsList) return;

        this.elements.productsList.innerHTML = '';

        this.data.products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.innerHTML = `
                <div class="product-info">
                    <div class="product-name">${this.sanitizeHtml(product.name)}</div>
                    <div class="product-price">${product.price}${CONFIG.DEFAULT_CURRENCY}</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn--sm btn--outline" onclick="app.editProduct(${product.id})">
                        Изменить
                    </button>
                    <button class="btn btn--sm btn--outline" 
                            onclick="app.toggleArchiveProduct(${product.id})">
                        ${product.archived ? 'Восстановить' : 'Архив'}
                    </button>
                    <button class="btn btn--sm btn--danger" onclick="app.deleteProduct(${product.id})">
                        Удалить
                    </button>
                </div>
            `;
            this.elements.productsList.appendChild(item);
        });
    }

    /**
     * Отрисовка пресетов количества
     */
    renderPresets() {
        this.elements.presetsContainer.innerHTML = '';

        this.data.presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset;
            btn.addEventListener('click', () => {
                this.elements.quantityInput.value = preset;
                this.calculateSum();
            });
            this.elements.presetsContainer.appendChild(btn);
        });
    }

    /**
     * Расчёт суммы
     */
    calculateSum() {
        const productId = parseInt(this.elements.productSelect.value);
        const quantity = parseFloat(this.elements.quantityInput.value) || 0;

        if (productId && quantity > 0) {
            const product = this.data.products.find(p => p.id === productId);
            if (product) {
                const sum = quantity * product.price;
                this.elements.sumAmount.textContent = `${sum.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;
                return;
            }
        }

        this.elements.sumAmount.textContent = `0 ${CONFIG.DEFAULT_CURRENCY}`;
    }

    /**
     * Добавление записи
     */
    addRecord() {
        const productId = parseInt(this.elements.productSelect.value);
        const quantity = parseFloat(this.elements.quantityInput.value);

        if (!productId) {
            this.showError('Выберите продукт');
            return;
        }

        if (!quantity || quantity <= 0) {
            this.showError('Введите корректное количество');
            return;
        }

        const product = this.data.products.find(p => p.id === productId);
        if (!product) {
            this.showError('Продукт не найден');
            return;
        }

        const record = {
            id: Date.now(),
            productId: productId,
            quantity: quantity,
            price: product.price,
            sum: quantity * product.price,
            date: new Date().toISOString()
        };

        // Создание снапшота для отката
        const snapshot = this.createSnapshot();

        // Добавление записи
        this.data.entries.push(record);

        // Запись в журнал
        this.addToLog('add_record', record, 'Добавлена запись', snapshot);

        // Сохранение данных
        this.saveData();

        // Очистка формы
        this.elements.quantityInput.value = '';
        this.elements.productSelect.value = '';
        this.calculateSum();

        // Обновление интерфейса
        this.renderRecords();
        if (this.currentScreen === 'statistics') {
            this.renderStatistics();
        }

        this.showSuccess('Запись добавлена');
    }

    /**
     * Удаление записи
     */
    deleteRecord(recordId) {
        this.showConfirm(
            'Удаление записи',
            'Вы уверены, что хотите удалить эту запись?',
            () => {
                const recordIndex = this.data.entries.findIndex(r => r.id === recordId);
                if (recordIndex === -1) return;

                const record = this.data.entries[recordIndex];
                const snapshot = this.createSnapshot();

                this.data.entries.splice(recordIndex, 1);

                this.addToLog('delete_record', record, 'Удалена запись', snapshot);
                this.saveData();
                this.renderRecords();

                if (this.currentScreen === 'statistics') {
                    this.renderStatistics();
                }

                this.showSuccess('Запись удалена');
            }
        );
    }

    /**
     * Отрисовка списка записей
     */
    renderRecords() {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0');
        const today = now.toDateString();

        // Фильтрация записей текущего месяца
        const monthRecords = this.data.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            const entryMonth = entryDate.getFullYear() + '-' + 
                String(entryDate.getMonth() + 1).padStart(2, '0');
            return entryMonth === currentMonth;
        });

        // Сортировка по дате (новые сверху)
        monthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Обновление сводки
        const todayRecords = monthRecords.filter(entry => 
            new Date(entry.date).toDateString() === today);
        const monthSum = monthRecords.reduce((sum, entry) => sum + entry.sum, 0);

        this.elements.todayCount.textContent = todayRecords.length;
        this.elements.monthSum.textContent = `${monthSum.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`;

        // Отрисовка списка
        this.elements.recordsList.innerHTML = '';

        if (monthRecords.length === 0) {
            this.elements.recordsList.innerHTML = `
                <div class="text-center" style="padding: 40px; color: var(--text-secondary);">
                    Записей за текущий месяц нет
                </div>
            `;
            return;
        }

        monthRecords.forEach(record => {
            const product = this.data.products.find(p => p.id === record.productId);
            const productName = product ? product.name : 'Неизвестный продукт';
            const recordDate = new Date(record.date);
            const dateStr = recordDate.toLocaleDateString(CONFIG.DATE_FORMAT);
            const timeStr = recordDate.toLocaleTimeString(CONFIG.DATE_FORMAT, {
                hour: '2-digit',
                minute: '2-digit'
            });

            const item = document.createElement('div');
            item.className = 'record-item';
            item.innerHTML = `
                <div class="record-info">
                    <div class="record-title">${this.sanitizeHtml(productName)}</div>
                    <div class="record-details">
                        ${record.quantity} × ${record.price}${CONFIG.DEFAULT_CURRENCY} = 
                        ${record.sum.toFixed(2)}${CONFIG.DEFAULT_CURRENCY}
                    </div>
                    <div class="record-details">${dateStr} ${timeStr}</div>
                </div>
                <div class="record-actions">
                    <button class="btn btn--sm btn--danger" 
                            onclick="app.deleteRecord(${record.id})" 
                            aria-label="Удалить запись">
                        🗑️
                    </button>
                </div>
            `;
            this.elements.recordsList.appendChild(item);
        });
    }

    /**
     * Отрисовка статистики
     */
    renderStatistics() {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0');

        // Записи текущего месяца
        const monthRecords = this.data.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            const entryMonth = entryDate.getFullYear() + '-' + 
                String(entryDate.getMonth() + 1).padStart(2, '0');
            return entryMonth === currentMonth;
        });

        // Расчёт дохода
        const income = monthRecords.reduce((sum, entry) => sum + entry.sum, 0);

        // Расчёт рабочих часов через модуль
        const workedHours = this.workSchedule ? 
            this.workSchedule.calculateMonthHours(now.getFullYear(), now.getMonth() + 1) : 0;

        // Данные о зарплате
        const salary = this.data.salary;
        const hourlyRate = salary.normHoursPerMonth > 0 ? 
            salary.baseSalary / salary.normHoursPerMonth : 0;
        const grossSalary = salary.baseSalary;
        const taxAmount = grossSalary * (salary.taxRate / 100);
        const netBeforeTax = grossSalary - taxAmount;
        const finalAmount = netBeforeTax - salary.advanceAmount;

        // Переработки
        const overtime = Math.max(0, workedHours - salary.normHoursPerMonth);
        const overtimePayment = overtime * hourlyRate;

        const stats = [
            {
                label: 'Доход (выручка)',
                value: `${income.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'income'
            },
            {
                label: 'Оклад',
                value: `${grossSalary.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'neutral'
            },
            {
                label: 'Часы отработано',
                value: `${workedHours.toFixed(1)} ч`,
                type: 'neutral'
            },
            {
                label: 'Почасовая ставка',
                value: `${hourlyRate.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}/ч`,
                type: 'neutral'
            },
            {
                label: 'Переработка',
                value: `${overtime.toFixed(1)} ч (+${overtimePayment.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY})`,
                type: overtime > 0 ? 'income' : 'neutral'
            },
            {
                label: 'До налогов',
                value: `${(grossSalary + overtimePayment).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'neutral'
            },
            {
                label: 'Налог (' + salary.taxRate + '%)',
                value: `${((grossSalary + overtimePayment) * (salary.taxRate / 100)).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'expense'
            },
            {
                label: 'Аванс',
                value: `${salary.advanceAmount.toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'expense'
            },
            {
                label: 'На руки (итог)',
                value: `${(netBeforeTax + overtimePayment - salary.advanceAmount).toFixed(2)} ${CONFIG.DEFAULT_CURRENCY}`,
                type: 'income'
            }
        ];

        this.elements.statsGrid.innerHTML = '';

        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = `stat-card stat-card--${stat.type}`;
            card.innerHTML = `
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            `;
            this.elements.statsGrid.appendChild(card);
        });
    }

    /**
     * Отрисовка истории
     */
    renderHistory() {
        const filterDate = this.elements.filterDate.value;
        const filterAction = this.elements.filterAction.value;

        let filteredLog = [...this.data.log];

        // Фильтрация по дате
        if (filterDate) {
            filteredLog = filteredLog.filter(entry => {
                const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
                return entryDate === filterDate;
            });
        }

        // Фильтрация по действию
        if (filterAction) {
            filteredLog = filteredLog.filter(entry => entry.action === filterAction);
        }

        // Сортировка по времени (новые сверху)
        filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        this.elements.historyList.innerHTML = '';

        if (filteredLog.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="text-center" style="padding: 40px; color: var(--text-secondary);">
                    История действий пуста
                </div>
            `;
            return;
        }

        filteredLog.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            const dateStr = entryDate.toLocaleDateString(CONFIG.DATE_FORMAT);
            const timeStr = entryDate.toLocaleTimeString(CONFIG.DATE_FORMAT, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-header-item">
                    <div class="history-action">${this.getActionName(entry.action)}</div>
                    <div class="history-time">${dateStr} ${timeStr}</div>
                </div>
                <div class="history-details">${this.sanitizeHtml(entry.details)}</div>
                <div class="history-actions">
                    <button class="btn btn--sm btn--outline" 
                            onclick="app.revertAction(${entry.id})"
                            ${!entry.snapshot ? 'disabled' : ''}>
                        ↶ Откатить
                    </button>
                </div>
            `;
            this.elements.historyList.appendChild(item);
        });
    }

    /**
     * Получение читаемого названия действия
     */
    getActionName(action) {
        const actionNames = {
            'add_record': 'Добавление записи',
            'delete_record': 'Удаление записи',
            'add_product': 'Добавление продукта',
            'edit_product': 'Изменение продукта',
            'delete_product': 'Удаление продукта',
            'settings': 'Изменение настроек',
            'import': 'Импорт данных',
            'export': 'Экспорт данных',
            'backup': 'Создание бэкапа',
            'restore': 'Восстановление данных'
        };
        return actionNames[action] || action;
    }

    /**
     * Откат действия
     */
    revertAction(logId) {
        const logEntry = this.data.log.find(entry => entry.id === logId);
        if (!logEntry || !logEntry.snapshot) {
            this.showError('Невозможно откатить это действие');
            return;
        }

        this.showConfirm(
            'Откат действия',
            `Вы уверены, что хотите откатить действие "${this.getActionName(logEntry.action)}"?`,
            () => {
                // Восстановление данных из снапшота
                this.restoreFromSnapshot(logEntry.snapshot);

                // Запись в журнал
                this.addToLog('revert', logEntry, `Откат: ${logEntry.details}`);

                // Сохранение и обновление интерфейса
                this.saveData();
                this.renderProducts();
                this.renderRecords();
                this.renderStatistics();
                this.renderHistory();

                this.showSuccess('Действие отменено');
            }
        );
    }

    /**
     * Создание снапшота данных для отката
     */
    createSnapshot() {
        return {
            products: JSON.parse(JSON.stringify(this.data.products)),
            entries: JSON.parse(JSON.stringify(this.data.entries)),
            shifts: JSON.parse(JSON.stringify(this.data.shifts)),
            salary: JSON.parse(JSON.stringify(this.data.salary))
        };
    }

    /**
     * Восстановление данных из снапшота
     */
    restoreFromSnapshot(snapshot) {
        this.data.products = JSON.parse(JSON.stringify(snapshot.products));
        this.data.entries = JSON.parse(JSON.stringify(snapshot.entries));
        this.data.shifts = JSON.parse(JSON.stringify(snapshot.shifts));
        this.data.salary = JSON.parse(JSON.stringify(snapshot.salary));
    }

    /**
     * Добавление записи в журнал
     */
    addToLog(action, item, details, snapshot = null) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: action,
            item: item,
            details: details,
            snapshot: snapshot
        };

        this.data.log.push(logEntry);

        // Ограничение размера журнала
        if (this.data.log.length > 1000) {
            this.data.log = this.data.log.slice(-1000);
        }
    }

    // =============================================================================
    // ПРОДУКТЫ
    // =============================================================================

    /**
     * Добавление продукта
     */
    addProduct() {
        const name = prompt('Введите название продукта:');
        if (!name) return;

        const priceStr = prompt('Введите цену:');
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) {
            this.showError('Введите корректную цену');
            return;
        }

        const snapshot = this.createSnapshot();

        const product = {
            id: Date.now(),
            name: name.trim(),
            price: price,
            archived: false,
            created: new Date().toISOString()
        };

        this.data.products.push(product);
        this.addToLog('add_product', product, `Добавлен продукт: ${product.name}`, snapshot);
        this.saveData();
        this.renderProducts();
        this.showSuccess('Продукт добавлен');
    }

    /**
     * Редактирование продукта
     */
    editProduct(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) return;

        const newName = prompt('Введите новое название:', product.name);
        if (!newName) return;

        const newPriceStr = prompt('Введите новую цену:', product.price);
        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice <= 0) {
            this.showError('Введите корректную цену');
            return;
        }

        const snapshot = this.createSnapshot();

        const oldName = product.name;
        product.name = newName.trim();
        product.price = newPrice;

        this.addToLog('edit_product', product, 
            `Изменён продукт: ${oldName} → ${product.name}`, snapshot);
        this.saveData();
        this.renderProducts();
        this.showSuccess('Продукт изменён');
    }

    /**
     * Переключение архивного статуса продукта
     */
    toggleArchiveProduct(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) return;

        const snapshot = this.createSnapshot();

        product.archived = !product.archived;
        const action = product.archived ? 'Архивирован' : 'Восстановлен';

        this.addToLog('edit_product', product, 
            `${action} продукт: ${product.name}`, snapshot);
        this.saveData();
        this.renderProducts();
        this.showSuccess(`Продукт ${action.toLowerCase()}`);
    }

    /**
     * Удаление продукта
     */
    deleteProduct(productId) {
        const product = this.data.products.find(p => p.id === productId);
        if (!product) return;

        // Проверяем, есть ли записи с этим продуктом
        const hasRecords = this.data.entries.some(entry => entry.productId === productId);
        if (hasRecords) {
            this.showError('Нельзя удалить продукт, по которому есть записи. Переведите его в архив.');
            return;
        }

        this.showConfirm(
            'Удаление продукта',
            `Вы уверены, что хотите удалить продукт "${product.name}"?`,
            () => {
                const snapshot = this.createSnapshot();
                const productIndex = this.data.products.findIndex(p => p.id === productId);

                this.data.products.splice(productIndex, 1);
                this.addToLog('delete_product', product, 
                    `Удалён продукт: ${product.name}`, snapshot);
                this.saveData();
                this.renderProducts();
                this.showSuccess('Продукт удалён');
            }
        );
    }

    // =============================================================================
    // НАСТРОЙКИ
    // =============================================================================

    /**
     * Открытие модального окна настроек
     */
    openSettingsModal() {
        // Заполнение текущими значениями
        this.elements.baseSalary.value = this.data.salary.baseSalary;
        this.elements.taxRate.value = this.data.salary.taxRate;
        this.elements.advanceAmount.value = this.data.salary.advanceAmount;
        this.elements.workSchedule.value = this.data.salary.workSchedule;
        this.elements.hoursPerShift.value = this.data.salary.hoursPerShift;
        this.elements.scheduleStartDate.value = this.data.salary.scheduleStartDate;
        this.elements.normHoursPerMonth.value = this.data.salary.normHoursPerMonth;

        this.elements.themeSelect.value = this.data.theme;
        this.elements.presetsInput.value = this.data.presets.join(',');

        // Настройки бэкапа
        const backup = this.data.backup;
        this.elements.autoBackupEnabled.checked = backup.autoBackup;
        this.elements.backupPeriod.value = backup.backupPeriod;
        this.elements.backupService.value = backup.backupService;

        // Отрисовка списка продуктов
        this.renderProductsList();

        // Показ модального окна
        this.elements.settingsModal.classList.add('modal--active');
    }

    /**
     * Закрытие модального окна настроек
     */
    closeSettingsModal() {
        this.elements.settingsModal.classList.remove('modal--active');
    }

    /**
     * Сохранение настроек
     */
    saveSettings() {
        try {
            const snapshot = this.createSnapshot();

            // Сохранение настроек зарплаты
            this.data.salary = {
                baseSalary: parseFloat(this.elements.baseSalary.value) || 0,
                taxRate: parseFloat(this.elements.taxRate.value) || 0,
                advanceAmount: parseFloat(this.elements.advanceAmount.value) || 0,
                workSchedule: this.elements.workSchedule.value,
                hoursPerShift: parseFloat(this.elements.hoursPerShift.value) || 8,
                scheduleStartDate: this.elements.scheduleStartDate.value,
                normHoursPerMonth: parseFloat(this.elements.normHoursPerMonth.value) || 168
            };

            // Сохранение темы
            const newTheme = this.elements.themeSelect.value;
            if (newTheme !== this.data.theme) {
                this.applyTheme(newTheme);
            }

            // Сохранение пресетов
            const presetsStr = this.elements.presetsInput.value;
            const presets = presetsStr.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);
            this.data.presets = presets.length > 0 ? presets : CONFIG.DEFAULT_DATA.presets;

            // Сохранение настроек бэкапа
            this.data.backup.autoBackup = this.elements.autoBackupEnabled.checked;
            this.data.backup.backupPeriod = this.elements.backupPeriod.value;
            this.data.backup.backupService = this.elements.backupService.value;

            // Обновление модуля графика работы
            if (this.workSchedule) {
                this.workSchedule.updateSettings(this.data.salary);
            }

            this.addToLog('settings', this.data.salary, 'Изменены настройки', snapshot);
            this.saveData();

            // Обновление интерфейса
            this.renderPresets();
            if (this.currentScreen === 'statistics') {
                this.renderStatistics();
            }

            this.closeSettingsModal();
            this.showSuccess('Настройки сохранены');

        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            this.showError('Ошибка сохранения настроек');
        }
    }

    // =============================================================================
    // ЭКСПОРТ/ИМПОРТ
    // =============================================================================

    /**
     * Экспорт в CSV
     */
    exportCsv() {
        try {
            const now = new Date();
            const currentMonth = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0');

            const monthRecords = this.data.entries.filter(entry => {
                const entryDate = new Date(entry.date);
                const entryMonth = entryDate.getFullYear() + '-' + 
                    String(entryDate.getMonth() + 1).padStart(2, '0');
                return entryMonth === currentMonth;
            });

            if (monthRecords.length === 0) {
                this.showError('Нет записей для экспорта');
                return;
            }

            // Заголовки CSV (UTF-8 с BOM)
            let csvContent = '\ufeffДата,Продукт,Количество,Цена,Сумма\n';

            monthRecords.forEach(record => {
                const product = this.data.products.find(p => p.id === record.productId);
                const productName = product ? product.name : 'Неизвестный продукт';
                const date = new Date(record.date).toLocaleDateString(CONFIG.DATE_FORMAT);

                csvContent += `"${date}","${productName}","${record.quantity}","${record.price}","${record.sum.toFixed(2)}"\n`;
            });

            this.downloadFile(csvContent, `export-${currentMonth}.csv`, 'text/csv;charset=utf-8;');

            this.addToLog('export', {type: 'csv', count: monthRecords.length}, 
                `Экспорт CSV: ${monthRecords.length} записей`);
            this.showSuccess('CSV файл загружен');

        } catch (error) {
            console.error('Ошибка экспорта CSV:', error);
            this.showError('Ошибка экспорта CSV');
        }
    }

    /**
     * Экспорт в JSON
     */
    exportJson() {
        try {
            const exportData = {
                version: CONFIG.VERSION,
                timestamp: new Date().toISOString(),
                data: {
                    products: this.data.products,
                    entries: this.data.entries,
                    shifts: this.data.shifts,
                    salary: this.data.salary,
                    log: this.data.log,
                    presets: this.data.presets,
                    theme: this.data.theme,
                    backup: this.data.backup
                }
            };

            const jsonContent = JSON.stringify(exportData, null, 2);
            this.downloadFile(jsonContent, `backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');

            this.addToLog('export', {type: 'json'}, 'Полный экспорт данных в JSON');
            this.showSuccess('JSON файл загружен');

        } catch (error) {
            console.error('Ошибка экспорта JSON:', error);
            this.showError('Ошибка экспорта JSON');
        }
    }

    /**
     * Экспорт истории
     */
    exportHistory() {
        try {
            const historyData = {
                version: CONFIG.VERSION,
                timestamp: new Date().toISOString(),
                history: this.data.log
            };

            const jsonContent = JSON.stringify(historyData, null, 2);
            this.downloadFile(jsonContent, `history-${new Date().toISOString().split('T')[0]}.json`, 'application/json');

            this.showSuccess('История экспортирована');

        } catch (error) {
            console.error('Ошибка экспорта истории:', error);
            this.showError('Ошибка экспорта истории');
        }
    }

    /**
     * Импорт продуктов из CSV
     */
    async importProducts(file) {
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                this.showError('Файл должен содержать заголовки и данные');
                return;
            }

            const snapshot = this.createSnapshot();
            let imported = 0;

            // Пропускаем заголовок
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const columns = this.parseCSVLine(line);

                if (columns.length >= 2) {
                    const name = columns[0].trim();
                    const price = parseFloat(columns[1]);

                    if (name && !isNaN(price) && price > 0) {
                        const product = {
                            id: Date.now() + i,
                            name: name,
                            price: price,
                            archived: false,
                            created: new Date().toISOString()
                        };

                        this.data.products.push(product);
                        imported++;
                    }
                }
            }

            if (imported > 0) {
                this.addToLog('import', {type: 'products', count: imported}, 
                    `Импорт продуктов: ${imported} шт.`, snapshot);
                this.saveData();
                this.renderProducts();
                this.showSuccess(`Импортировано ${imported} продуктов`);
            } else {
                this.showError('Не удалось импортировать ни одного продукта');
            }

        } catch (error) {
            console.error('Ошибка импорта:', error);
            this.showError('Ошибка импорта файла');
        }

        // Очистка поля файла
        this.elements.importProductsFile.value = '';
    }

    /**
     * Восстановление из бэкапа
     */
    async restoreBackup(file) {
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const backupData = JSON.parse(text);

            // Валидация структуры
            if (!backupData.data) {
                this.showError('Неверный формат файла бэкапа');
                return;
            }

            const message = `Восстановить данные из бэкапа?\n\n` +
                `Версия: ${backupData.version || 'неизвестна'}\n` +
                `Дата: ${new Date(backupData.timestamp).toLocaleString(CONFIG.DATE_FORMAT)}\n` +
                `Продуктов: ${backupData.data.products?.length || 0}\n` +
                `Записей: ${backupData.data.entries?.length || 0}\n\n` +
                `Текущие данные будут заменены!`;

            this.showConfirm(
                'Восстановление данных',
                message,
                () => {
                    const snapshot = this.createSnapshot();

                    // Восстановление данных
                    if (backupData.data.products) {
                        this.data.products = backupData.data.products;
                    }
                    if (backupData.data.entries) {
                        this.data.entries = backupData.data.entries;
                    }
                    if (backupData.data.shifts) {
                        this.data.shifts = backupData.data.shifts;
                    }
                    if (backupData.data.salary) {
                        this.data.salary = backupData.data.salary;
                    }
                    if (backupData.data.presets) {
                        this.data.presets = backupData.data.presets;
                    }
                    if (backupData.data.theme) {
                        this.data.theme = backupData.data.theme;
                        this.applyTheme(this.data.theme);
                    }
                    if (backupData.data.backup) {
                        this.data.backup = backupData.data.backup;
                    }

                    // Восстановление журнала (объединение)
                    if (backupData.data.log) {
                        this.data.log = [...this.data.log, ...backupData.data.log];
                    }

                    this.addToLog('restore', backupData, 
                        `Восстановление из бэкапа: ${backupData.version}`, snapshot);
                    this.saveData();

                    // Обновление интерфейса
                    this.renderProducts();
                    this.renderPresets();
                    this.renderRecords();
                    this.renderStatistics();
                    this.renderHistory();

                    this.showSuccess('Данные восстановлены');
                }
            );

        } catch (error) {
            console.error('Ошибка восстановления:', error);
            this.showError('Ошибка чтения файла бэкапа');
        }

        // Очистка поля файла
        this.elements.restoreBackupFile.value = '';
    }

    // =============================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =============================================================================

    /**
     * Загрузка файла
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
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
     * Чтение файла как текст
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Парсинг строки CSV
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Пропускаем следующую кавычку
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Санитизация HTML
     */
    sanitizeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    /**
     * Показ сообщения об успехе
     */
    showSuccess(message) {
        console.log('SUCCESS:', message);
        // Здесь можно добавить тост-уведомления
    }

    /**
     * Показ ошибки
     */
    showError(message) {
        console.error('ERROR:', message);
        alert(message);
    }

    /**
     * Показ диалога подтверждения
     */
    showConfirm(title, message, onConfirm) {
        this.elements.confirmTitle.textContent = title;
        this.elements.confirmMessage.textContent = message;

        // Обработчик подтверждения
        const handleConfirm = () => {
            this.elements.confirmModal.classList.remove('modal--active');
            this.elements.confirmYesBtn.removeEventListener('click', handleConfirm);
            this.elements.confirmNoBtn.removeEventListener('click', handleCancel);
            onConfirm();
        };

        // Обработчик отмены
        const handleCancel = () => {
            this.elements.confirmModal.classList.remove('modal--active');
            this.elements.confirmYesBtn.removeEventListener('click', handleConfirm);
            this.elements.confirmNoBtn.removeEventListener('click', handleCancel);
        };

        this.elements.confirmYesBtn.addEventListener('click', handleConfirm);
        this.elements.confirmNoBtn.addEventListener('click', handleCancel);

        this.elements.confirmModal.classList.add('modal--active');
    }
}

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================================================

// Глобальная переменная для доступа к приложению
let app;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductionAccountingApp();
});

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанное отклонение Promise:', event.reason);
});