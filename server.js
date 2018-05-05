const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://gagan:gagan@gagan-affqi.mongodb.net/oshop";
const DB = 'oshop';

function doDbOperation(operation) {

    MongoClient.connect(uri, function (err, client) {
        try {
            if (err) {
                console.log('Error while connecting to db', err);
            } else {
                console.log('Performing DB operation');
                operation(client);
            }
        } catch (ex) {
            console.log('Error while db operation', ex);
        } finally {
            client.close();
        }
    });
}

app.options('*', (req, res) => {
    setCorsHeader(res);
    res.sendStatus(200);
})

function setCorsHeader(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    // res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
}

app.use(express.static('oshop'));

app.use(function (req, res, next) {
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

app.get('/api/users/:id', (req, res) => {
    console.log('userid', req.params.id);
    doDbOperation(client =>{
        client.db(DB).collection('users').findOne({providerId: req.params.id})
        .then(user => res.json(user))
        .catch(err=> console.log('Error while finding user in db', err));
    }
    );
});

// New user
app.post('/api/users', (req, res) => {
    console.log(req.body);
    doDbOperation(client => {
        client.db(DB).collection('users').updateOne({ email: req.body.email },{$set: req.body} , { upsert: true }).then(dbResponse => {
            res.json({ rowsChanged: dbResponse.result.n });
        })
    });
});

app.listen(80, () => console.log('Server running'));
