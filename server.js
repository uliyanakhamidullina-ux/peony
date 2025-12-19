const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Разрешаем запросы с вашего сайта
app.use(cors());
app.use(express.json()); // Чтобы сервер понимал JSON

// Подключение к базе данных Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Обязательно для Render
    }
});

// --- 1. СОЗДАНИЕ ТАБЛИЦ (Запустить 1 раз через браузер) ---
app.get('/setup-db', async (req, res) => {
    try {
        // Таблица пользователей
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100)
            );
        `);

        // Таблица заказов (ОТДЕЛЬНАЯ ТАБЛИЦА)
        // cart_items будем хранить как текст (JSON), чтобы не усложнять
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
        res.status(500).send('Ошибка создания таблиц: ' + err.message);
    }
});

// --- 2. РЕГИСТРАЦИЯ ---
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка регистрации (email занят?)' });
    }
});

// --- 3. ВХОД ---
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

// --- 4. СОХРАНЕНИЕ ЗАКАЗА (Новый функционал) ---
app.post('/api/orders', async (req, res) => {
    const { userName, phone, address, totalPrice, cartItems } = req.body;
    
    // Превращаем массив товаров в строку для сохранения в БД
    const itemsString = JSON.stringify(cartItems);

    try {
        await pool.query(
            'INSERT INTO orders (user_name, phone, address, total_price, cart_items) VALUES ($1, $2, $3, $4, $5)',
            [userName, phone, address, totalPrice, itemsString]
        );
        res.json({ message: 'Заказ успешно сохранен!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сохранения заказа' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});