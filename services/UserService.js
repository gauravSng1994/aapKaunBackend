/**
 * User Service
 * @namespace services
 * */

export default class UserService {

    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            _db.User.findOne({'emails.email': email}).exec((err, _user) => {
                if (err) return reject(err);
                resolve(_user);
            });
        });
    }

    getUserByID(id) {
        return new Promise((resolve, reject) => {
            _db.User.findOne({_id: id}).exec((err, _user) => {
                if (err) return reject(err);
                resolve(_user);
            });
        });
    }

    listUsers() {
        return new Promise((resolve, reject) => {
            _db.User.find().exec((err, _users) => {
                if (err) return reject(err);
                resolve(_users);
            });
        })
    }

    createUser() {
        return new _db.User()
    }

    updateUser(_id, user) {
        return new Promise((resolve, reject) => {
            _db.User
                .update({
                    _id
                }, {
                    $set: user
                })
                .exec((err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                })
        })
    }
}
