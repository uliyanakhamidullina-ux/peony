/* script.js */

// !!! ВАЖНО: Сюда вставьте адрес вашего сервера с Render !!!
// Пример: const BACKEND_URL = 'https://peony-shop.onrender.com';
const BACKEND_URL = ''; // Используйте это для локальных тестов

// Глобальные переменные
let authModal, cartModal;
let loginBlock, registerBlock;
let cart = []; 

document.addEventListener('DOMContentLoaded', function() {
    // 1. Инициализация элементов
    authModal = document.getElementById('authModal');
    cartModal = document.getElementById('cartModal');
    loginBlock = document.getElementById('loginFormBlock');
    registerBlock = document.getElementById('registerFormBlock');

    // 2. Загрузка данных
    loadCart();     // Загружаем корзину из памяти
    checkAuth();    // Проверяем, вошел ли пользователь

    // 3. Логика кнопок выбора размера (на странице товара)
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const parent = this.parentElement;
            parent.querySelectorAll('.size-option').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 4. ОБРАБОТКА РЕГИСТРАЦИИ (Через сервер)
    const regForm = document.getElementById('regForm');
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const inputs = regForm.querySelectorAll('input');
            const name = inputs[0].value;
            const email = inputs[1].value;
            const pass = inputs[2].value;
            const confirm = inputs[3].value;
            const error = document.getElementById('passError');

            // --- НОВАЯ ПРОВЕРКА: Длина пароля ---
            if (pass.length < 6) {
                alert('Пароль должен содержать минимум 6 символов!');
                return;
            }

            // Проверка совпадения паролей
            if (pass !== confirm) {
                error.style.display = 'block';
                return;
            }
            error.style.display = 'none';

            // Отправка на сервер
            try {
                const response = await fetch(`${BACKEND_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password: pass })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Регистрация успешна! Теперь войдите в аккаунт.');
                    switchForm('login');
                    // Автозаполнение email в форме входа
                    const loginEmailInput = document.querySelector('#loginFormBlock input[type="email"]');
                    if (loginEmailInput) loginEmailInput.value = email;
                    regForm.reset();
                } else {
                    alert('Ошибка: ' + (data.error || 'Не удалось зарегистрироваться'));
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка соединения с сервером. Проверьте, запущен ли backend.');
            }
        });
    }

    // 5. ОБРАБОТКА ВХОДА (Через сервер)
    const loginFormContainer = document.getElementById('loginFormBlock');
    const loginForm = loginFormContainer ? loginFormContainer.querySelector('form') : null;
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = loginForm.querySelectorAll('input');
            const email = inputs[0].value;
            const pass = inputs[1].value;

            try {
                const response = await fetch(`${BACKEND_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                });

                const user = await response.json();

                if (response.ok) {
                    // Сохраняем текущего пользователя в браузере, чтобы помнить его
                    localStorage.setItem('peonyCurrentUser', JSON.stringify(user));
                    checkAuth(); // Обновляем шапку
                    closeModal(null, 'authModal');
                    loginForm.reset();
                } else {
                    alert(user.error || 'Неверный email или пароль');
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка соединения с сервером.');
            }
        });
    }

    // 6. ОФОРМЛЕНИЕ ЗАКАЗА (Отправка в Базу Данных)
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (cart.length === 0) {
                alert('Корзина пуста!');
                return;
            }

            const name = document.getElementById('orderName').value;
            const phone = document.getElementById('orderPhone').value;
            const address = document.getElementById('orderComment').value;
            
            // Считаем общую сумму
            const total = cart.reduce((sum, item) => sum + item.price, 0);

            // Блокируем кнопку на время отправки
            const btn = checkoutForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Отправка...';
            btn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userName: name,
                        phone: phone,
                        address: address,
                        totalPrice: total,
                        cartItems: cart
                    })
                });

                if (response.ok) {
                    alert(`Спасибо, ${name}! Заказ успешно сохранен в базе данных.`);
                    cart = []; // Очищаем корзину
                    saveCart();
                    renderCart();
                    closeModal(null, 'cartModal');
                    checkoutForm.reset();
                } else {
                    alert('Ошибка при сохранении заказа на сервере.');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось соединиться с сервером.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});

// --- ФУНКЦИИ АВТОРИЗАЦИИ И ШАПКИ ---

function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('peonyCurrentUser'));
    const navIcons = document.querySelector('.nav-icons');
    
    const oldGreeting = document.getElementById('userGreetingBlock');
    if (oldGreeting) oldGreeting.remove();

    const loginIcon = navIcons.querySelector('.fa-user');

    if (currentUser) {
        if (loginIcon) loginIcon.style.display = 'none';

        const greetingDiv = document.createElement('div');
        greetingDiv.id = 'userGreetingBlock';
        greetingDiv.style.display = 'flex';
        greetingDiv.style.alignItems = 'center';
        
        greetingDiv.innerHTML = `
            <span class="user-greeting">Привет, ${currentUser.name}</span>
            <i class="fas fa-sign-out-alt logout-btn" title="Выйти" onclick="logout()"></i>
        `;
        navIcons.insertBefore(greetingDiv, navIcons.firstChild);
    } else {
        if (loginIcon) loginIcon.style.display = 'inline-block';
    }
}

function logout() {
    localStorage.removeItem('peonyCurrentUser');
    checkAuth();
}

// --- ЛОГИКА КОРЗИНЫ ---

function addToCart(title, price, image) {
    const activeSizeBtn = document.querySelector('.size-option.active');
    if (document.querySelector('.size-options') && !activeSizeBtn) {
        alert('Пожалуйста, выберите размер!');
        return;
    }
    const size = activeSizeBtn ? activeSizeBtn.innerText : '';
    const product = { id: Date.now(), title, price, image, size };
    cart.push(product);
    saveCart();
    updateCartCount();
    alert(`Товар "${title}" добавлен в корзину!`);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

function saveCart() { localStorage.setItem('peonyCart', JSON.stringify(cart)); updateCartCount(); }
function loadCart() { const savedCart = localStorage.getItem('peonyCart'); if (savedCart) { cart = JSON.parse(savedCart); updateCartCount(); } }

function updateCartCount() {
    const els = document.querySelectorAll('.cart-count');
    els.forEach(el => { el.innerText = cart.length; el.style.display = cart.length > 0 ? 'flex' : 'none'; });
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    const cartContent = document.getElementById('cartContent');
    const emptyMsg = document.getElementById('cartEmptyMsg');
    container.innerHTML = '';
    let totalPrice = 0;

    if (cart.length === 0) {
        cartContent.style.display = 'none'; emptyMsg.style.display = 'block';
    } else {
        cartContent.style.display = 'block'; emptyMsg.style.display = 'none';
        cart.forEach(item => {
            totalPrice += item.price;
            const sizeHTML = item.size ? `<div class="cart-item-size">Размер: ${item.size}</div>` : '';
            container.innerHTML += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.title}">
                    <div class="cart-item-info"><div class="cart-item-title">${item.title}</div><div class="cart-item-price">${item.price.toLocaleString()} ₽</div>${sizeHTML}</div>
                    <i class="fas fa-trash-alt remove-item" onclick="removeFromCart(${item.id})" title="Удалить"></i>
                </div>`;
        });
    }
    totalElement.innerText = totalPrice.toLocaleString() + ' ₽';
}

// --- ЛОГИКА ГАЛЕРЕИ (СЛАЙДЕР) ---

function currentSlide(n) {
    const mainImg = document.getElementById('mainProductImg');
    const thumbs = document.getElementsByClassName('thumb-img');
    
    if (mainImg && thumbs.length > 0) {
        mainImg.src = thumbs[n].src;
        for (let i = 0; i < thumbs.length; i++) {
            thumbs[i].classList.remove('active');
        }
        thumbs[n].classList.add('active');
    }
}

function changeSlide(n) {
    const thumbs = document.getElementsByClassName('thumb-img');
    if (thumbs.length === 0) return;

    let currentIndex = 0;
    for (let i = 0; i < thumbs.length; i++) {
        if (thumbs[i].classList.contains('active')) {
            currentIndex = i;
            break;
        }
    }

    let newIndex = currentIndex + n;
    if (newIndex >= thumbs.length) newIndex = 0;
    else if (newIndex < 0) newIndex = thumbs.length - 1;

    currentSlide(newIndex);
}

// --- УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ---

function openModal(modalName) {
    if (modalName === 'login') { 
        if (authModal) { 
            authModal.classList.add('active'); 
            switchForm('login'); 
        } 
    }
    else if (modalName === 'cart') { 
        if (cartModal) { 
            renderCart(); 
            cartModal.classList.add('active'); 
        } 
    }
}

function closeModal(event, modalId) {
    const modal = document.getElementById(modalId);
    if (event) { if (event.target === modal) modal.classList.remove('active'); }
    else if (modal) modal.classList.remove('active');
}

function closeModalBtn(modalId) { 
    const modal = document.getElementById(modalId); 
    if (modal) modal.classList.remove('active'); 
}

function switchForm(type) {
    if (loginBlock && registerBlock) {
        loginBlock.style.display = type === 'login' ? 'block' : 'none';
        registerBlock.style.display = type === 'login' ? 'none' : 'block';
    }
}
