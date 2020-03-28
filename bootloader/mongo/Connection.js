import mongoose from 'mongoose';
import DataTable from 'mongoose-datatable';
class Connection {

    constructor(mongoUrl,callback) {
        Connection._connections = Connection._connections || {};
        this.mongoUrl = mongoUrl;
        this.connect(callback);
    }

    connect(callback){
        if(!this.mongoUrl) throw new Error('Can not connect to db without a mongo url');
        if(Connection._connections[this.mongoUrl]) return callback(null, Connection._connections[this.mongoUrl], mongoose);
        mongoose.connect(this.mongoUrl);
        let db = mongoose.connection;
        db.on('error',callback);
        db.once('open', ()=>{
            log.infor('Connected to Mongodb!');
            Connection._connections[this.mongoUrl] = db;
            mongoose.plugin(DataTable.init);
            callback(null,Connection._connections[this.mongoUrl], mongoose);
        });
    }
}

export default Connection;