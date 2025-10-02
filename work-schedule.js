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
    const monthStart = new Date(year, month - 1, 1);
    
    // Берём либо конец месяца, либо сегодня — что раньше
    const now = new Date();
    const monthEnd = new Date(year, month, 0);
    const endDate = now < monthEnd ? now : monthEnd;
    
    let totalHours = 0;
    
    // Проходим только по дням до сегодняшней даты (включительно)
    for (let date = new Date(monthStart); date <= endDate; date.setDate(date.getDate() + 1)) {
      if (this.isWorkDay(date, startDate)) {
        totalHours += this.settings.hoursPerShift;
      }
    }
    
    return totalHours;
  }
  
  isWorkDay(currentDate, startDate) {
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (this.settings.workSchedule === '2/2') {
      // 2 рабочих, 2 выходных
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
