/**
 * User model
 * */

import MongoDbModel from '../../bootloader/mongo';
import bcrypt from 'bcrypt-nodejs';

export default class User extends MongoDbModel {

    /* Needed functions by the MongoDbModel Interface */
    static get Name() {
        return this.name; //Return other string if need a different model name
    }

    static get Schema() {
        return mongoose => ({
            name: {
                first: String,
                middle: String,
                last: String
            },
            emails: [{
                email: String,
                isPrimary: Boolean,
                isVerified: Boolean
            }],
            profilePic: String,
            companies: [
                {
                    company: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'},
                    role: String
                }
            ],
            password: String,
            phoneNumbers: [{
                number: String,
                countryCode: String,
                isPrimary: Boolean,
                isVerified: Boolean
            }],
            createdAt: Date,
            updatedAt: Date,
            createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser'},
            updatedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser'}
        })
    }

    static get Indexes() {
        return [
            {name: 1},
            {email: 1, password: 1}
        ];
    }

    /* Our functions here */
    verifyPassword(password) {
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, this.password, (error, result) => {
                if (error) return reject(error)
                resolve(result)
            });
        })
    }

    setPassword(password, workFactor = 10) {
        let self = this;
        return new Promise((resolve, reject) => {
            bcrypt.genSalt(workFactor, function (err, salt) {
                if (err) return reject(err);
                bcrypt.hash(password, salt, () => null, function (err, hash) {
                    if (err) return reject(err);
                    self.password = hash;
                    resolve();
                });
            });
        })
    }
}
