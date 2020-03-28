import Connection from './Connection';

const ObjectId = require("mongoose").Types.ObjectId;

class MongoDbModel {

    static initialize(mongoUrl, callback) {
        if (!mongoUrl) throw new Error('MongoDb Url is required to initialize Mongo model.');
        new Connection(mongoUrl, (err, db, mongoose) => {
            if (err) return callback(err);

            // Ensure interface implemented
            if (!this.Name) throw new Error('Please implement Name in Model class');
            if (!this.Schema) throw new Error('Please implement Schema in Model class');
            if (!this.Indexes) throw new Error('Please implement Indexes in Model class');

            // Define Schema
            let schema = mongoose.Schema(this.Schema(mongoose));

            // Add in member functions
            let instance = new this();
            Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).forEach(memberFn => {
                if (['length', 'name', 'prototype', 'Name', 'Schema', 'Indexes', 'initialize', 'constructor'].indexOf(memberFn) < 0) {
                    schema.methods[memberFn] = Object.getPrototypeOf(instance)[memberFn];
                }
            });

            // Add in statis functions
            Object.getOwnPropertyNames(this).forEach(staticFn => {
                if (['length', 'name', 'prototype', 'Name', 'Schema', 'Indexes', 'initialize'].indexOf(staticFn) < 0) {
                    schema.statics[staticFn] = this[staticFn];
                }
            });
            schema.statics.convertToObjectId = MongoDbModel.convertToObjectId;

            // Build Model
            let model = mongoose.model(this.Name, schema);

            //Index
            (this.Indexes || []).forEach(index => {
                schema.index(index);
            });
            model.ensureIndexes();

            callback(null, model);
        });
    }

    static convertToObjectId(id) {
        let objectId = null;
        if (id instanceof ObjectId) {
            objectId = id;
        } else if (id) {
            try {
                objectId = ObjectId(id);
            } catch (c) {
                objectId = null;
            }
        }
        return objectId;
    }
}

export default MongoDbModel;
