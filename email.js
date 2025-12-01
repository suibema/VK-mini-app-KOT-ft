async function initialize() {
  try {
    await vkBridge.send('VKWebAppInit');
    console.log('VK Mini App initialized');

    const u = await vkBridge.send('VKWebAppGetUserInfo');
    window.vkUserId = u.id;

    configureFirstByStartParam();
  } catch (err) {
    console.error('VK init error:', err);
    const errorEl = document.getElementById('reg-error');
    if (errorEl) {
      errorEl.textContent = 'Ошибка инициализации VK: ' + err.message;
    }
  }
}

initialize()

document.getElementById('email-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const errorEl = document.getElementById('email-error');

  try {
    const find_email = await fetch(`https://ndb.fut.ru/api/v2/tables/moqj9txmglwy87u/records/count?where=(tg-id,eq,${window.vkUserId})`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
      }
    });

    const data_found_email = await find_email.json();

    if (data_found_email.count === 0) {
      errorEl.textContent = 'Не нашли тебя в базе регистрации! Пожалуйста, зарегистрируйся через форму в боте или напиши нам с вопросом';
      return;
    }

    const res = await fetch(`https://ndb.fut.ru/api/v2/tables/moqj9txmglwy87u/records/count?where=(tg-id,eq,${window.vkUserId})~and(Результат КОТ,neq,-1)`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
      }
    });

    const data = await res.json();

    if (data.count > 0) {
      errorEl.textContent = 'Мы уже получили результат твоего теста и скоро вернёмся с ответом 😊';
      return;
    }

    localStorage.setItem('test_email', window.vkUserId);
    window.location.href = 'test.html';
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Ошибка сервера. Повтори попытку позже';
  }
});