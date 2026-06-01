const express = require('express');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const redis = require('redis');

const app = express();
const port = 3000;

const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

const USERS_CACHE_TTL = 60;
const PRODUCTS_CACHE_TTL = 600;

function cacheMiddleware(keyBuilder, ttl) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            redisClient.get(key, (err, cachedData) => {
                if (err) {
                    console.error('Cache read error:', err);
                    return next();
                }
                
                if (cachedData) {
                    console.log(`Cache HIT: ${key}`);
                    return res.json(JSON.parse(cachedData));
                }
                
                console.log(`Cache MISS: ${key}`);
                req.cacheKey = key;
                req.cacheTTL = ttl;
                next();
            });
        } catch (err) {
            console.error('Cache middleware error:', err);
            next();
        }
    };
}

async function saveToCache(key, data, ttl) {
    try {
        redisClient.setex(key, ttl, JSON.stringify(data));
        console.log(`Saved to cache: ${key} (TTL: ${ttl}s)`);
    } catch (err) {
        console.error('Cache save error:', err);
    }
}

async function invalidateUsersCache(userId = null) {
    try {
        redisClient.del('users:all');
        if (userId) {
            redisClient.del(`users:${userId}`);
        }
        console.log(`Cache invalidated: users${userId ? `:${userId}` : ':all'}`);
    } catch (err) {
        console.error('Cache invalidate error:', err);
    }
}

async function invalidateProductsCache(productId = null) {
    try {
        redisClient.del('products:all');
        if (productId) {
            redisClient.del(`products:${productId}`);
        }
        console.log(`Cache invalidated: products${productId ? `:${productId}` : ':all'}`);
    } catch (err) {
        console.error('Cache invalidate error:', err);
    }
}

const ACCESS_SECRET = 'access_secret_key_2025';
const REFRESH_SECRET = 'refresh_secret_key_2025';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const ROLES = {
    GUEST: 'guest',
    USER: 'user',
    SELLER: 'seller',
    ADMIN: 'admin'
};

let users = [];
let products = [];
let refreshTokens = new Set();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    });
    next();
});

function authMiddleware(req, res, next) {
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

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Access denied. Required role: ' + allowedRoles.join(' or '),
                yourRole: req.user.role
            });
        }
        
        next();
    };
}

function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Auth + Products + RBAC',
            version: '4.0.0',
            description: 'Авторизация с ролями (USER, SELLER, ADMIN) + Redis кэш',
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

app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password, role = ROLES.USER } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: "All fields required" });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: "Email already exists" });
    }

    let finalRole = ROLES.USER;
    if (users.length === 0) {
        finalRole = ROLES.ADMIN;
    } else {
        if (role === ROLES.ADMIN || role === ROLES.SELLER) {
            finalRole = role;
        } else {
            finalRole = ROLES.USER;
        }
    }

    const newUser = {
        id: nanoid(8),
        email,
        first_name,
        last_name,
        role: finalRole,
        isBlocked: false,
        hashedPassword: await hashPassword(password)
    };

    users.push(newUser);
    
    res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role
    });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password required" });
    }

    const user = findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBlocked) {
        return res.status(403).json({ error: "Account is blocked" });
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    res.json({
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        }
    });
});

app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken required" });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = findUserById(payload.id);
        
        if (!user || user.isBlocked) {
            return res.status(401).json({ error: "User not found or blocked" });
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
        return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        role: req.user.role
    });
});

app.get("/api/users", 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]),
    cacheMiddleware(() => 'users:all', USERS_CACHE_TTL),
    async (req, res) => {
        const safeUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
            isBlocked: u.isBlocked
        }));
        await saveToCache(req.cacheKey, safeUsers, req.cacheTTL);
        res.json(safeUsers);
    }
);

app.get("/api/users/:id", 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]),
    cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
    async (req, res) => {
        const user = findUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const safeUser = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            isBlocked: user.isBlocked
        };
        await saveToCache(req.cacheKey, safeUser, req.cacheTTL);
        res.json(safeUser);
    }
);

app.put("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const { first_name, last_name, role, isBlocked } = req.body;
    
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (role !== undefined && [ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(role)) {
        user.role = role;
    }
    if (isBlocked !== undefined) user.isBlocked = isBlocked;

    await invalidateUsersCache(req.params.id);

    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isBlocked: user.isBlocked
    });
});

app.delete("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    user.isBlocked = true;
    
    await invalidateUsersCache(req.params.id);
    
    res.json({ message: "User blocked successfully", user: { id: user.id, isBlocked: true } });
});

app.post("/api/products", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
    const { title, category, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !category || !description || !price) {
        return res.status(400).json({ error: "All fields required" });
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
    
    await invalidateProductsCache();
    
    res.status(201).json(newProduct);
});

app.get("/api/products", 
    authMiddleware, 
    roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]),
    cacheMiddleware(() => 'products:all', PRODUCTS_CACHE_TTL),
    async (req, res) => {
        await saveToCache(req.cacheKey, products, req.cacheTTL);
        res.json(products);
    }
);

app.get("/api/products/:id", 
    authMiddleware, 
    roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]),
    cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
    async (req, res) => {
        const product = products.find(p => p.id === req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        await saveToCache(req.cacheKey, product, req.cacheTTL);
        res.json(product);
    }
);

app.put("/api/products/:id", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
    const { title, category, description, price } = req.body;
    const productId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    const product = products[productIndex];
    
    if (userRole !== ROLES.ADMIN && product.ownerId !== userId) {
        return res.status(403).json({ error: "You can only update your own products" });
    }

    if (title !== undefined) product.title = title;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);

    await invalidateProductsCache(productId);

    res.json(product);
});

app.delete("/api/products/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found" });
    }

    products.splice(productIndex, 1);
    
    await invalidateProductsCache(productId);
    
    res.json({ message: "Product deleted successfully" });
});

app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/api-docs`);
    console.log(`Access token expires in: ${ACCESS_EXPIRES_IN}`);
    console.log(`Refresh token expires in: ${REFRESH_EXPIRES_IN}`);
    console.log(`Redis cache: users (60s), products (600s)`);
});

process.on('SIGINT', async () => {
    redisClient.quit();
    console.log('\nRedis disconnected');
    process.exit(0);
});