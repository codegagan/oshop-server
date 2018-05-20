const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const uri = process.env.mongoUri;
const DB = 'oshop';
const originsWhitelist = ['http://oshop.codegagan.com', 'http://codegagan.surge.sh', 'http://codegagan.com'];
const oshopPort = process.env.oshopPort;
let dbClient;
let db;

const exitHandler = signal => {
    log('Got signal ' + signal + ', closing DB connection and Exiting')
    dbClient.close();
    process.exit(signal);
};

MongoClient.connect(uri)
    .then(client => {
        dbClient = client;
        db = client.db(DB);
        app.listen(oshopPort, () => log('Connected to DB and server is listening on port' + oshopPort));
        //process.on('exit', exitHandler);
        process.on('SIGINT', exitHandler);
        process.on('SIGUSR1', exitHandler);
        process.on('SIGUSR2', exitHandler);
        process.on('uncaughtException', exitHandler);
    })
    .catch(err => console.log('Error while connecting to Db', err));

// Middlewares
app.options('*', (req, res) => {
    log('Preflight from: '+ req.headers.origin);
    setCorsHeader(req, res);
    res.sendStatus(200);
})

function setCorsHeader(req, res) {
    if (originsWhitelist.indexOf(req.headers.origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
        // res.setHeader('Access-Control-Allow-Credentials','true');
        res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, x-codegagan');
    }
}

app.use(function (req, res, next) {
    log("Request: " + req.method + req.url + req.headers.origin);
    if (req.header('content-type') === 'application/json' && req.header('x-codegagan') === 'gagan') {
        setCorsHeader(req, res);
        next();
    } else {
        log('Bad request');
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
        .catch(err => log('Error while finding user in db ' + err));
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
    db.collection('products').deleteOne({ _id: new mongodb.ObjectId(req.params.id) })
        .then(result => res.json({ rowsChanged: result.result.n }))
        .catch(err => res.status(500).send(err));
});

// Shopping Cart

app.post('/api/shopping-cart', (req, res) => {
    let shoppingCart = { creationTime: new Date().getTime(), items: req.body.keys ? [{ ...req.body, quantity: 1 }] : [] };
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

// Order

app.post('/api/orders', (req, res) => {
    db.collection('orders').insertOne(req.body)
        .then(result => res.json(req.body))
        .catch(err => res.status(500).send(err));
});

app.get('/api/orders', (req, res) => {
    db.collection('orders').find({ user: req.query.user }).toArray()
        .then(result => res.json(result))
        .catch(err => res.status(500).send(err));
});

//app.use(express.static('oshop'));

// For angular paths
// app.get('/*', function(req, res) {
//     res.sendFile(path.join(__dirname + '/oshop/index.html'));
// });

// Utility functions
function log(line) {
    db.collection('logs').insertOne({time: new Date().toLocaleString(), log: line});
}
