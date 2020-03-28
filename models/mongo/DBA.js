const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dbaSchema = new Schema({
    name: String,
    email: String,
    password:String,
    isAdmin:Boolean,
});

const DBA = mongoose.model('DBA',dbaSchema);
module.exports = DBA;