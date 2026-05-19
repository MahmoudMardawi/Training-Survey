// public/js/admin-login.js
import { apiFetch } from './shared/api.js';

const form = document.getElementById('login-form');
const u = document.getElementById('u');
const p = document.getElementById('p');
const err = document.getElementById('err');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.hidden = true;
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  try {
    await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: u.value, password: p.value }),
    });
    window.location.href = '/admin';
  } catch (ex) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    if (ex.status === 429) {
      err.textContent = 'محاولات تسجيل دخول متعدّدة. يرجى المحاولة بعد ١٠ دقائق.';
    } else {
      err.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
    err.hidden = false;
  }
});
