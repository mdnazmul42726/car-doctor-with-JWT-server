const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jjnxlzj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unuthoraized' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthoraized' })
        }

        // valid user
        req.decoded = decoded
        next();
    })
}

async function run() {

    try {
        await client.connect();

        const servicesCollection = client.db("carsDB").collection("services");
        const bookCollection = client.db("carsDB").collection('book');


        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true, secure: false }).send({ success: true })
        })

        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                projection: { title: 1, service_id: 1, price: 1, img: 1 }
            };
            const result = await servicesCollection.findOne(query, options);
            res.send(result)
        });

        app.get('/book', verifyToken, async (req, res) => {
            if (req.query.email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden' })
            }
            // console.log('L66', req.decoded);
            // console.log('L67', req.query.email);
            let query = {};
            console.log('token', req.cookies);
            if (req.query?.email) {
                query = { email: req.query.email };
            };
            const result = await bookCollection.find(query).toArray();
            res.send(result)
        });

        app.post('/book', async (req, res) => {
            const doc = req.body;
            const result = await bookCollection.insertOne(doc)
            res.send(result);
        });

        app.patch('/book/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const data = req.body;
            const updatedDoc = {
                $set: { status: data.status }
            };
            const result = await bookCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/book/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookCollection.deleteOne(query);
            res.send(result);
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => res.send('car doctor is running'));
app.listen(port, () => console.log('car doctor is running on port:', port))