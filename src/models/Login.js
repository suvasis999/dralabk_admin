const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );

class LoginStatsModel {

    initSchema() {

       
        const schema = new Schema( {
            'random_field': {
                'type': Boolean,
            }
        }, { 'timestamps': true } );

        schema.index({'createdAt':-1})
        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'loginstats', schema );
        } catch ( e ) {
            
        }

      
    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'loginstats' );
    }
    
    
}

const LoginStats = new LoginStatsModel().getInstance();

module.exports = { LoginStats, LoginStatsModel };
