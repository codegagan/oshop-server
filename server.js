const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const uri = "mongodb+srv://gagan:gagan@gagan-affqi.mongodb.net/oshop";
const DB = 'oshop';
let dbClient;
let db;

const exitHandler = signal => {
    console.log('Closing DB connection before exit with', signal);
    dbClient.close();
    process.exit(signal);
};

MongoClient.connect(uri)
    .then(client => {
        dbClient = client;
        db = client.db(DB);
        app.listen(80, () => console.log('Connected to DB and server is listening'));
        //process.on('exit', exitHandler);
        process.on('SIGINT', exitHandler);
        process.on('SIGUSR1', exitHandler);
        process.on('SIGUSR2', exitHandler);
        process.on('uncaughtException', exitHandler);
    })
    .catch(err => console.log('Error while connecting to Db', err));

// Middlewares
app.options('*', (req, res) => {
    setCorsHeader(res);
    res.sendStatus(200);
})

function setCorsHeader(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
    // res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
}

app.use(express.static('oshop'));

app.use(function (req, res, next) {
    console.log("Request: ", req.method, req.url);
    if (req.header('content-type') === 'application/json') {
        setCorsHeader(res);
        next();
    } else {
        res.sendStatus(400);
    }
})

app.use(bodyParser.json({
    strict: true,
    type: function () {
        return true;
    }
}));

// APIs

// Users
app.get('/api/users/:id', (req, res) => {
    db.collection('users').findOne({ providerId: req.params.id })
        .then(user => res.json(user))
        .catch(err => console.log('Error while finding user in db', err));
});

// Create or update user
app.post('/api/users', (req, res) => {
    db.collection('users').updateOne({ email: req.body.email }, { $set: req.body }, { upsert: true })
        .then(dbResponse => {
            res.json({ rowsChanged: dbResponse.result.n });
        })
});

// Categories
app.get('/api/categories', (req, res) => {
    let docs = db.collection('categories').find().project({ _id: 0 }).toArray()
        .then(docs => res.json(docs))
        .catch(err => res.status(500).send(err));
});

// Products

app.post('/api/products', (req, res) => {
    db.collection('products').insertOne(req.body)
        .then(result => res.json({ rowsChanged: result.result.n }))
        .catch(err => res.status(500).send(err));
});

app.get('/api/products', (req, res) => {
    db.collection('products').find().toArray()
        .then(result => res.json(result))
        .catch(err => res.status(500).send(err));
});

app.get('/api/products/:id', (req, res) => {
    db.collection('products').findOne({ _id: new mongodb.ObjectId(req.params.id) })
        .then(result => res.json(result))
        .catch(err => res.status(500).send(err));
});

app.put('/api/products/:id', (req, res) => {
    db.collection('products').updateOne({ _id: new mongodb.ObjectId(req.params.id) }, { $set: req.body })
        .then(result => res.json({ rowsChanged: result.result.n }))
        .catch(err => res.status(500).send(err));
});

app.delete('/api/products/:id', (req, res) => {
    db.collection('products').deleteOne({_id: new mongodb.ObjectId(req.params.id)})
    .then(result => res.json({rowsChanged: result.result.n}))
    .catch(err => res.status(500).send(err));
});

// Shopping Cart

app.post('/api/shopping-cart', (req, res) => {
    console.log("req body", req.body);
    let shoppingCart = {creationTime: new Date().getTime(), items: req.body.keys? [{...req.body, quantity: 1}] : [] };
    console.log('creating shopping cart', JSON.stringify(shoppingCart));
    db.collection('shopping-cart').insertOne(shoppingCart)
        .then(result => res.json(shoppingCart))
        .catch(err => res.status(500).send(err));
});

app.get('/api/shopping-cart/:id', (req, res) => {
    db.collection('shopping-cart').findOne({ _id: new mongodb.ObjectId(req.params.id) })
    .then(result => res.json(result))
    .catch(err => res.status(500).send(err));
});

app.put('/api/shopping-cart/:id', (req, res) => {
    delete req.body._id;
    db.collection('shopping-cart').updateOne({ _id: new mongodb.ObjectId(req.params.id) }, { $set: req.body })
    .then(result => res.json(req.body))
    .catch(err => res.status(500).send(err));
});
