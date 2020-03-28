const express = require('express');
const mongoose = require('mongoose');
const DBA = require('./models/mongo/DBA.js');
mongoose.connect('mongodb://localhost/aapkaun', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const app = express();
app.get('/',(req,res)=>{
    res.send("<h1>welcome to aap kaun</h1>");
});
app.get('/dba',async (req,res)=>{
    let allDbas =await DBA.find();
    console.log("DBAs",allDbas);
    res.send(allDbas);
});
app.listen(8000,()=>{
    console.log('listening to port 8000...');
});