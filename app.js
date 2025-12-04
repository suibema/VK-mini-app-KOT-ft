// ================== НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ ==================

function showScreen(name) {
  const ids = ['screen-start', 'screen-test', 'screen-bye'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (id === `screen-${name}`) ? 'block' : 'none';
  });
}

let vkUserId = null;
let testInitialized = false;

// ================== VK INIT ==================

async function initializeVk() {
  try {
    await vkBridge.send('VKWebAppInit');
    const u = await vkBridge.send('VKWebAppGetUserInfo');
    vkUserId = `${u.id}_VK`;
    console.log('VK Mini App initialized, user id:', vkUserId);
  } catch (err) {
    console.error('VK init error:', err);
    const errorEl = document.getElementById('email-error');
    if (errorEl) {
      errorEl.textContent = 'Ошибка инициализации VK: ' + err.message;
    }
  }
}

// ================== СТАРТОВЫЙ ЭКРАН ==================

function setupStartForm() {
  const form = document.getElementById('email-form');
  const errorEl = document.getElementById('email-error');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorEl.textContent = '';

    if (!vkUserId) {
      errorEl.textContent = 'Не удалось получить данные VK. Попробуй перезапустить приложение.';
      return;
    }

    try {
      const find_email = await fetch(
        `https://ndb.fut.ru/api/v2/tables/m6tyxd3346dlhco/records/count?where=(tg-id,eq,${vkUserId})`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
          }
        }
      );

      const data_found_email = await find_email.json();

      if (data_found_email.count === 0) {
        errorEl.textContent =
          'Не нашли тебя в базе регистрации! Пожалуйста, зарегистрируйся через форму в боте или напиши нам с вопросом';
        return;
      }

      const res = await fetch(
        `https://ndb.fut.ru/api/v2/tables/m6tyxd3346dlhco/records/count?where=(tg-id,eq,${vkUserId})~and(Результат КОТ,neq,-1)`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
          }
        }
      );

      const data = await res.json();

      if (data.count > 0) {
        errorEl.textContent = 'Мы уже получили результат твоего теста и скоро вернёмся с ответом 😊';
        return;
      }

      localStorage.setItem('test_email', vkUserId.toString());
      localStorage.removeItem('test_submitted');

      showScreen('test');
      if (!testInitialized) {
        initTestScreen();
        testInitialized = true;
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Ошибка сервера. Повтори попытку позже';
    }
  });
}

// ================== ТЕСТ ==================

const DURATION = 15 * 60;

const correctAnswers = { 
  q1: 'a', q2: 'c', q3: 'd', q4: 'b', q5: 'скрипка', q6: 'c', q7: 'c', q8: 'c', q9: 'c', q10: '125', 
  q11: 'ста', q12: '80', q13: 'c', q14: 'd', q15: '0,07', q16: 'никогда', q17: 'a', q18: '2', q19: 'ласка', q20: 'a',
  q21: '25', q22: '75', q23: 'a', q24: 'c', q25: '0,27', q26: 'b', q27: '150', q28: 'c', q29: 'abd', q30: 'a',
  q31: '12546', q32: 'ad', q33: '1,33', q34: 'a', q35: 'дельфин', q36: 'c', q37: '480', q38: 'c', q39: '20', q40: '1/6',
  q41: 'c', q42: '0,1', q43: 'a', q44: '50', q45: '25', q46: '3500', q47: 'be', q48: 'c', q49: '2', q50: '17'
};

const questionTypes = {};
['q1', 'q2', 'q3', 'q4', 'q6', 'q7', 'q8', 'q9', 'q13', 'q14', 'q17', 'q20', 'q23', 'q24', 'q26', 'q28', 'q30', 'q34', 'q36', 'q38', 'q41', 'q43', 'q48']
  .forEach(q => questionTypes[q] = 'dropdown');
['q5', 'q10', 'q11', 'q12', 'q15', 'q16', 'q18', 'q19', 'q21', 'q22', 'q25', 'q27', 'q31', 'q33', 'q35', 'q37', 'q39', 'q40', 'q42', 'q44', 'q45', 'q46', 'q49', 'q50']
  .forEach(q => questionTypes[q] = 'text');
['q29', 'q32', 'q47'].forEach(q => questionTypes[q] = 'checkbox');

function initTestScreen() {
  const form = document.getElementById('test-form');
  const resultEl = document.getElementById('result');
  const errorEl = document.getElementById('error');
  const timeDisplay = document.getElementById('time-display');
  const timerContainer = document.getElementById('timer');

  if (!form) return;

  const email = localStorage.getItem('test_email');
  if (!email) {
    // если почему-то нет id — назад на старт
    showScreen('start');
    return;
  }

  // Сохранение формы в localStorage
  function saveForm() {
    const formData = new FormData(form);
    const data = {};
    for (let i = 1; i <= 50; i++) {
      const qName = `q${i}`;
      if (questionTypes[qName] === 'checkbox') {
        data[qName] = Array.from(formData.getAll(qName));
      } else {
        data[qName] = formData.get(qName) || '';
      }
    }
    localStorage.setItem('test_data', JSON.stringify(data));
  }

  // Восстановление формы
  function restoreForm() {
    const saved = JSON.parse(localStorage.getItem('test_data') || '{}');
    for (let i = 1; i <= 50; i++) {
      const qName = `q${i}`;
      if (questionTypes[qName] === 'checkbox' && Array.isArray(saved[qName])) {
        saved[qName].forEach(value => {
          const checkbox = document.querySelector(`input[name="${qName}"][value="${value}"]`);
          if (checkbox) checkbox.checked = true;
        });
      } else if (['dropdown', 'text'].includes(questionTypes[qName]) && saved[qName]) {
        const input = form.elements[qName];
        if (input) input.value = saved[qName];
      }
    }
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  function calculateScore(data) {
    let score = 0;
    for (let i = 1; i <= 50; i++) {
      const qName = `q${i}`;
      const answer = data[qName];
      const correct = correctAnswers[qName];
      if (questionTypes[qName] === 'checkbox') {
        if (Array.isArray(answer) &&
            JSON.stringify(answer.slice().sort()) === JSON.stringify(correct.split('').sort())) {
          score++;
        }
      } else if (questionTypes[qName] === 'dropdown') {
        if (answer === correct) score++;
      } else if (questionTypes[qName] === 'text') {
        if ((answer || '').trim().toLowerCase() === correct.toString().toLowerCase()) score++;
      }
    }
    return score;
  }

  async function submitForm(auto = false) {
    const formData = new FormData(form);
    const data = {};
    for (let i = 1; i <= 50; i++) {
      const qName = `q${i}`;
      if (questionTypes[qName] === 'checkbox') {
        data[qName] = Array.from(formData.getAll(qName));
      } else {
        data[qName] = formData.get(qName) || '';
      }
    }
    data.email = email;

    const score = calculateScore(data);
    console.log('Submitting', { ...data, score });

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'ОТПРАВЛЯЕТСЯ...';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ЗАВЕРШИТЬ';
      }, 5000);
    }

    try {
      const find = await fetch(
        `https://ndb.fut.ru/api/v2/tables/m6tyxd3346dlhco/records?where=(tg-id,eq,${encodeURIComponent(email)})&fields=Id`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
          }
        }
      );
      const foundData = await find.json();
      if (!foundData.list || foundData.list.length === 0) {
        errorEl.textContent = 'No record found for this tg id.';
        return;
      }
      const recordId = foundData.list[0].Id;

      // 2. Обновляем результат КОТ
      const res = await fetch(
        `https://ndb.fut.ru/api/v2/tables/m6tyxd3346dlhco/records`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
          },
          body: JSON.stringify({
            Id: recordId,
            'Результат КОТ': score,
            'Дата получения ответа на тест': new Date().toISOString(),
            'Время получения ответа на тест': new Date().toLocaleTimeString('ru-RU', {
              timeZone: 'Europe/Moscow',
              hour: '2-digit',
              minute: '2-digit'
            })
          })
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Update failed: ${errorText}`);
      }

      const recordData = {};
      for (let i = 1; i <= 50; i++) {
        recordData[`${i} вопрос`] = data[`q${i}`] || '';
      }
      recordData['tg id'] = email;
      recordData['device'] = navigator.userAgent;
      recordData['таймер'] = localStorage.getItem('remaining_time');
      recordData['таймер (прошло при выходе)'] = parseInt(localStorage.getItem('time_elapsed') || '0', 10);

      await fetch('https://ndb.fut.ru/api/v2/tables/mrijjjbahegwmet/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xc-token': 'crDte8gB-CSZzNujzSsy9obQRqZYkY3SNp8wre88'
        },
        body: JSON.stringify(recordData)
      });

      localStorage.setItem('test_submitted', 'true');
      localStorage.removeItem('start_time');
      localStorage.removeItem('test_data');

      form.style.display = 'none';
      if (timerContainer) timerContainer.style.display = 'none';
      errorEl.textContent = '';
      showScreen('bye');
    } catch (err) {
      console.error('Submission error:', err);
      errorEl.textContent = 'Ошибка отправки теста';
    }
  }

  function startTimer() {
    if (!localStorage.getItem('start_time')) {
      localStorage.setItem('start_time', Date.now().toString());
    }

    function tick() {
      const start = parseInt(localStorage.getItem('start_time') || '0', 10);
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, DURATION - elapsed);
      localStorage.setItem('remaining_time', remaining.toString());
      if (timeDisplay) timeDisplay.textContent = formatTime(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (timerContainer) timerContainer.style.display = 'none';
        submitForm(true);
      }
    }

    tick();
    var intervalId = setInterval(tick, 1000);
  }

  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });
  form.addEventListener('input', saveForm);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.textContent = '';
    submitForm(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const start = parseInt(localStorage.getItem('start_time') || '0', 10);
      if (start) {
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        localStorage.setItem('time_elapsed', elapsed.toString());
      }
    }
  });

  restoreForm();
  startTimer();
}

// ================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==================

document.addEventListener('DOMContentLoaded', () => {
  showScreen('start');         
  initializeVk();
  setupStartForm();

  const email = localStorage.getItem('test_email');
  const submitted = localStorage.getItem('test_submitted') === 'true';

  if (email && submitted) {
    showScreen('bye');
  } else if (email && !submitted) {
    showScreen('test');
    if (!testInitialized) {
      initTestScreen();
      testInitialized = true;
    }
  }
});
