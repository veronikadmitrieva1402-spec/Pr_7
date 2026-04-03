const express = require('express');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
const port = 3000;

const ACCESS_SECRET = 'access_secret_key';
const REFRESH_SECRET = 'refresh-secret-key';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

let users = [];
let products = [];

let refreshTokens = new Set();

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Auth + Products',
            version: '2.0.0',
            description: 'Контрольная номер 2',
        },
        servers: [{ url: `http://localhost:${port}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./main.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' && req.body && !req.body.password) {
            console.log('Body:', req.body);
        }
    });
    next();
});

function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

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
 *         description: Успешный вход, возвращает токен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
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
    if (!isAuthenticated) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    refreshTokens.add(refreshToken);

    res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        }
    });
});
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновить accessToken и refreshToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: refreshToken не предоставлен
 *       401:
 *         description: Невалидный или просроченный refreshToken
 */

app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({error: "refresh is required"});
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({error: "invalid"});
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = findUserById(payload.id);

        if (!user) {
            return res.status(401).json({error: "User not found"});
        }

        refreshTokens.delete(refreshToken);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        return res.status(401).json({ error: "Invalid"});
    }
});


/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Объект текущего пользователя
 *       401:
 *         description: Токен не предоставлен
 *       403:
 *         description: Токен недействителен
 */
app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name
    });
});


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар (требуется токен)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, description, price]
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post("/api/products", authenticateToken, async (req, res) => {
    const { title, category, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !category || !description || !price) {
        return res.status(400).json({ error: "title, category, description, price are required" });
    }

    const newProduct = {
        id: nanoid(8),
        title,
        category,
        description,
        price: Number(price),
        ownerId: userId
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
 *     summary: Получить товар по ID (требуется токен)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authenticateToken, (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар (требуется токен, только владелец)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
app.put("/api/products/:id", authenticateToken, async (req, res) => {
    const { title, category, description, price } = req.body;
    const productId = req.params.id;
    const userId = req.user.id;

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const product = products[productIndex];
    
    if (product.ownerId !== userId) {
        return res.status(403).json({ error: "You can only update your own products" });
    }

    if (title !== undefined) product.title = title;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
app.delete("/api/products/:id", authenticateToken, async (req, res) => {
    const productId = req.params.id;
    const userId = req.user.id;

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const product = products[productIndex];
    
    if (product.ownerId !== userId) {
        return res.status(403).json({ error: "You can only delete your own products" });
    }

    products.splice(productIndex, 1);
    res.json({ message: "Product deleted successfully" });
});

app.listen(port, () => {
    console.log(`Сервер: http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/api-docs`);
});