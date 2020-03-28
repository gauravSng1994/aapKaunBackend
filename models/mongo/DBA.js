import MongoDbModel from "../../bootloader/mongo/MongoDbModel";
import bcrypt from 'bcrypt-nodejs'

export default class DBA extends MongoDbModel{

    static get Name(){
        return this.name;
    }

    static get Schema(){
        return mongoose => ({
            name: String,
            email: String,
            password:String,
            isAdmin:Boolean,
        })
    }

    static get Indexes() {
        return [
            {name:1},
            {email:1, password:1}
        ]
    }

    // other function here
}


















//
// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;
//
// const dbaSchema = new Schema({
//     name: String,
//     email: String,
//     password:String,
//     isAdmin:Boolean,
// });
//
// const DBA = mongoose.model('DBA',dbaSchema);
// module.exports = DBA;