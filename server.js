const express = require('express');
const app = express();

//app.get('/', (req, res) => res.send("Welcome to Jumpbox !"));

app.use(express.static('oshop'));

app.listen(80, ()=> console.log('Server running'));


