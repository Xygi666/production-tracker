class WorkScheduleManager {
  constructor() {
    this.settings = { workSchedule: 'off', hoursPerShift: 12, scheduleStartDate: '2025-09-01' };
  }
  
  updateSettings(settings) { 
    this.settings = { ...this.settings, ...settings }; 
  }
  
  calculateAutoHours(year, month) {
    if (this.settings.workSchedule === 'off') return 0;
    
    const startDate = new Date(this.settings.scheduleStartDate);
    startDate.setHours(0, 0, 0, 0); // Обнуляем время
    
    const monthStart = new Date(year, month - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    
    // Берём МЕНЬШЕЕ из: конец месяца или сегодня
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(year, month, 0); // Последний день месяца
    monthEnd.setHours(0, 0, 0, 0);
    
    // Считаем только до вчерашнего дня включительно (не считаем сегодняшний день, если он не завершён)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const endDate = yesterday < monthEnd ? yesterday : monthEnd;
    
    // Если считаем за будущий месяц или за месяц, который ещё не начался
    if (endDate < monthStart) return 0;
    
    let totalHours = 0;
    
    // Проходим по каждому дню от начала месяца до вчера
    for (let date = new Date(monthStart); date <= endDate; date.setDate(date.getDate() + 1)) {
      if (this.isWorkDay(date, startDate)) {
        totalHours += this.settings.hoursPerShift;
      }
    }
    
    return totalHours;
  }
  
  isWorkDay(currentDate, startDate) {
    // Количество дней от даты начала графика
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (this.settings.workSchedule === '2/2') {
      // Цикл: 2 рабочих, 2 выходных
      // daysDiff % 4: 0,1 = работа; 2,3 = выходной
      return (daysDiff % 4) < 2;
    }
    
    if (this.settings.workSchedule === '5/2') {
      // Пн-Пт рабочие
      const dayOfWeek = currentDate.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
    
    return false;
  }
}
