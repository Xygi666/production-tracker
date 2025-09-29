class BackupManager {
  constructor(app) {
    this.app = app;
    this.yandexToken = localStorage.getItem('yandex_token');
    this.googleToken = localStorage.getItem('google_token');
  }

  // Авторизация в Яндекс.Диске
  async authorizeYandex() {
    const clientId = 'ваш_yandex_client_id'; // Нужно получить в Яндекс.OAuth
    const redirectUri = encodeURIComponent(window.location.origin + '/production-tracker/');
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=cloud_api:disk.write`;
    
    window.open(authUrl, '_blank', 'width=500,height=600');
  }

  // Авторизация в Google Drive
  async authorizeGoogle() {
    const clientId = 'ваш_google_client_id'; // Нужно получить в Google Cloud Console
    const redirectUri = encodeURIComponent(window.location.origin + '/production-tracker/');
    const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=https://www.googleapis.com/auth/drive.file&response_type=token`;
    
    window.open(authUrl, '_blank', 'width=500,height=600');
  }

  // Загрузка на Яндекс.Диск
  async uploadToYandex(content, filename) {
    if (!this.yandexToken) {
      if (confirm('Требуется авторизация в Яндекс.Диске. Выполнить?')) {
        await this.authorizeYandex();
        return;
      }
      return false;
    }

    try {
      // Получаем ссылку для загрузки
      const uploadUrlResponse = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=/${filename}&overwrite=true`, {
        headers: { 'Authorization': `OAuth ${this.yandexToken}` }
      });
      
      if (!uploadUrlResponse.ok) throw new Error('Ошибка получения ссылки');
      
      const { href } = await uploadUrlResponse.json();
      
      // Загружаем файл
      const uploadResponse = await fetch(href, {
        method: 'PUT',
        body: content
      });
      
      if (uploadResponse.ok) {
        alert('Файл успешно загружен на Яндекс.Диск');
        return true;
      }
    } catch (error) {
      console.error('Ошибка загрузки на Яндекс.Диск:', error);
      alert('Ошибка загрузки на Яндекс.Диск');
    }
    return false;
  }

  // Загрузка на Google Drive
  async uploadToGoogle(content, filename) {
    if (!this.googleToken) {
      if (confirm('Требуется авторизация в Google Drive. Выполнить?')) {
        await this.authorizeGoogle();
        return;
      }
      return false;
    }

    try {
      const metadata = {
        name: filename,
        parents: ['appDataFolder'] // Папка приложения
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      form.append('file', new Blob([content], {type: 'application/json'}));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.googleToken}` },
        body: form
      });

      if (response.ok) {
        alert('Файл успешно загружен на Google Drive');
        return true;
      }
    } catch (error) {
      console.error('Ошибка загрузки на Google Drive:', error);
      alert('Ошибка загрузки на Google Drive');
    }
    return false;
  }

  // Автоматический бэкап
  async performAutoBackup(service) {
    const backup = this.createBackup();
    const content = JSON.stringify(backup, null, 2);
    const filename = `auto-backup-${new Date().toISOString().slice(0,10)}.json`;

    switch(service) {
      case 'yandex':
        return await this.uploadToYandex(content, filename);
      case 'google':
        return await this.uploadToGoogle(content, filename);
      case 'email':
        this.sendEmailBackup(content, filename);
        return true;
      default:
        return false;
    }
  }

  createBackup() {
    return {
      version: CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      data: this.app.data
    };
  }

  sendEmailBackup(content, filename) {
    const subject = encodeURIComponent('Автоматический бэкап Production Tracker');
    const body = encodeURIComponent(`Автоматический бэкап от ${new Date().toLocaleDateString()}\n\nСодержимое файла:\n${content}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }
}
