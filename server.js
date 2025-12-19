const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path'); // <-- ВАЖНО: Добавили модуль для работы с путями
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 1. Настройки безопасности и парсинга
app.use(cors());
app.use(express.json());

// 2. ВАЖНО: Раздача статических файлов (CSS, JS, Images)
// Это говорит серверу: "Ищи файлы в текущей папке"
app.use(express.static(__dirname));

// 3. Подключение к базе данных
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- API МАРШРУТЫ (База данных) ---

app.get('/setup-db', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100)
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(100),
                phone VARCHAR(50),
                address TEXT,
                total_price INTEGER,
                cart_items TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        res.send('База данных успешно настроена! Таблицы users и orders созданы.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка настройки БД: ' + err.message);
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Неверные данные' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/orders', async (req, res) => {
    const { userName, phone, address, totalPrice, cartItems } = req.body;
    const itemsString = JSON.stringify(cartItems);
    try {
        await pool.query(
            'INSERT INTO orders (user_name, phone, address, total_price, cart_items) VALUES ($1, $2, $3, $4, $5)',
            [userName, phone, address, totalPrice, itemsString]
        );
        res.json({ message: 'Заказ сохранен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сохранения заказа' });
    }
});

// 4. ВАЖНО: Маршрут для Главной страницы
// Если сервер не понял запрос, он вернет index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
