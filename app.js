const express = require('express');
const mongoose = require('mongoose');


const app = express();
app.get('/',(req,res)=>{
    res.send("<h1>welcome to aap kaun</h1>");
});
app.listen(8000,()=>{
    console.log('listening to port 8000...');
});