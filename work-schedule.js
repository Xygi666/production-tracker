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
    startDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    // КРИТИЧНО: считаем только до сегодняшнего дня (не включая)
    const lastDay = new Date(Math.min(now.getTime(), monthEnd.getTime()));
    lastDay.setDate(lastDay.getDate() - 1); // Вчера
    
    console.log('[WorkSchedule] Расчёт за', year, month);
    console.log('[WorkSchedule] Начало месяца:', monthStart.toISOString().slice(0,10));
    console.log('[WorkSchedule] Сегодня:', now.toISOString().slice(0,10));
    console.log('[WorkSchedule] Считаем до:', lastDay.toISOString().slice(0,10));
    
    if (lastDay < monthStart) {
      console.log('[WorkSchedule] Месяц ещё не начался');
      return 0;
    }
    
    let totalHours = 0;
    let workDays = [];
    
    for (let date = new Date(monthStart); date <= lastDay; date.setDate(date.getDate() + 1)) {
      if (this.isWorkDay(date, startDate)) {
        totalHours += this.settings.hoursPerShift;
        workDays.push(date.toISOString().slice(0,10));
      }
    }
    
    console.log('[WorkSchedule] Рабочие дни:', workDays);
    console.log('[WorkSchedule] Итого часов:', totalHours);
    
    return totalHours;
  }
  
  isWorkDay(currentDate, startDate) {
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (this.settings.workSchedule === '2/2') {
      return (daysDiff % 4) < 2;
    }
    
    if (this.settings.workSchedule === '5/2') {
      const dayOfWeek = currentDate.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
    
    return false;
  }
}
