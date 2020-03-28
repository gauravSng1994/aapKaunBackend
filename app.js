require("babel-register");
require("babel-core/register");
require("babel-polyfill");
require("colors");
require('autostrip-json-comments');

//setup for getting environment variables
const dotEnv = require('dotenv');
dotEnv.config();

// Timers
global.__timers = {main: +new Date()};
console.log("[FRAMEWORK]".bold.yellow, "Loading Main Module...".green);

// Load main
const Main = require('./main.js').default;

new Main(err => console.log("[FRAMEWORK]".bold.yellow, "App initialized!".green, 'Reported Errors:'.red, err));









// const express = require('express');
// const mongoose = require('mongoose');
// const DBA = require('./models/mongo/DBA.js');
// mongoose.connect('mongodb://localhost/aapkaun', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });
//
// const app = express();
// app.get('/',(req,res)=>{
//     res.send("<h1>welcome to aap kaun</h1>");
// });
// app.get('/dba',async (req,res)=>{
//     let allDbas =await DBA.find();
//     console.log("DBAs",allDbas);
//     res.send(allDbas);
// });
// app.listen(8000,()=>{
//     console.log('listening to port 8000...');
// });