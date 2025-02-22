const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        return client.db('appDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

// Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Calculator page
app.get('/calculator', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

// Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Calculator API routes
app.post('/calculate', async (req, res) => {
    try {
        const db = await connectDB();
        const calculations = db.collection('calculations');
        
        const { num1, num2, operation } = req.body;
        let result;
        
        switch(operation) {
            case 'add': result = Number(num1) + Number(num2); break;
            case 'subtract': result = Number(num1) - Number(num2); break;
            case 'multiply': result = Number(num1) * Number(num2); break;
            case 'divide': result = Number(num1) / Number(num2); break;
            default: return res.status(400).json({ message: 'Invalid operation' });
        }

        await calculations.insertOne({
            num1: Number(num1),
            num2: Number(num2),
            operation,
            result,
            timestamp: new Date()
        });

        res.json({ result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Registration API routes
app.post('/register', async (req, res) => {
    try {
        const db = await connectDB();
        const users = db.collection('users');

        const { username, email, password } = req.body;

        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const result = await users.insertOne({
            username,
            email,
            password,
            createdAt: new Date()
        });

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertedId
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/history', async (req, res) => {
    try {
        const db = await connectDB();
        const calculations = db.collection('calculations');
        const history = await calculations.find({}).sort({ timestamp: -1 }).limit(10).toArray();
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});