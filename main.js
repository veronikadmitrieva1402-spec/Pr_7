const express = require('express');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Auth + Products',
            version: '1.0.0',
            description: 'Авторизация + CRUD товаров',
        },
        servers: [{ url: `http://localhost:${port}` }],
    },
    apis: ['./main.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


let users = [];
let products = [];

app.use(express.json());

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' && req.body) {
            console.log('Body:', req.body);
        }
    });
    next();
});

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, password]
 *             properties:
 *               email:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Пользователь создан
 */

app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: "email, first_name, last_name, password are required" });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: "Email already exists" });
    }

    const newUser = {
        id: nanoid(8),
        email: email,
        first_name: first_name,
        last_name: last_name,
        hashedPassword: await hashPassword(password)
    };

    users.push(newUser);
    
    res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name
    });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход
 */

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
    }

    const user = findUserByEmail(email);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const isAuthenticated = await verifyPassword(password, user.hashedPassword);
    if (isAuthenticated) {
        res.status(200).json({ 
            login: true, 
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     responses:
 *       200:
 *         description: Список товаров
 *   post:
 *     summary: Создать товар
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, title, category, description, price]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 */

app.post("/api/products", async (req, res) => {
    const { email, password, title, category, description, price } = req.body;

    if (!email || !password || !title || !category || !description || !price) {
        return res.status(400).json({ error: "All fields required: email, password, title, category, description, price" });
    }

    const user = findUserByEmail(email);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const isAuth = await verifyPassword(password, user.hashedPassword);
    if (!isAuth) {
        return res.status(401).json({ error: "Invalid password" });
    }

    const newProduct = {
        id: nanoid(8),
        title,
        category,
        description,
        price: Number(price),
        ownerId: user.id
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.get("/api/products", (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "7NXht0wP"
 *         description: "ID товара (8 символов)"
 *   put:
 *     summary: Обновить товар
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *   delete:
 *     summary: Удалить товар
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */

app.get("/api/products/:id", (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
});

app.put("/api/products/:id", async (req, res) => {
    const { email, password, title, category, description, price } = req.body;
    const productId = req.params.id;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required for authentication" });
    }

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const product = products[productIndex];
    const user = findUserByEmail(email);
    
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    if (product.ownerId !== user.id) {
        return res.status(403).json({ error: "You can only update your own products" });
    }

    const isAuth = await verifyPassword(password, user.hashedPassword);
    if (!isAuth) {
        return res.status(401).json({ error: "Invalid password" });
    }

    if (title !== undefined) product.title = title;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);

    res.json(product);
});

app.delete("/api/products/:id", async (req, res) => {
    const { email, password } = req.body;
    const productId = req.params.id;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password required" });
    }

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const product = products[productIndex];
    const user = findUserByEmail(email);
    
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    if (product.ownerId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own products" });
    }

    const isAuth = await verifyPassword(password, user.hashedPassword);
    if (!isAuth) {
        return res.status(401).json({ error: "Invalid password" });
    }

    products.splice(productIndex, 1);
    res.json({ message: "Product deleted successfully" });
});

app.listen(port, () => {
    console.log(`Сервер: http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/api-docs`);
});