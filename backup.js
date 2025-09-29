class BackupManager {
  constructor(app) {
    this.app = app;
  }

  createBackup() {
    return {
      version: this.app.data.version || '3.2.7',
      timestamp: new Date().toISOString(),
      data: this.app.data
    };
  }

  exportBackup(format = 'json') {
    const backup = this.createBackup();
    const content = JSON.stringify(backup, null, 2);
    const filename = `backup-${new Date().toISOString().slice(0,10)}.json`;
    
    if (format === 'json') {
      this.downloadFile(content, filename, 'application/json');
    }
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (backup.data) {
            resolve(backup.data);
          } else {
            reject(new Error('Неверный формат файла бэкапа'));
          }
        } catch (error) {
          reject(new Error('Ошибка чтения файла'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }
}
