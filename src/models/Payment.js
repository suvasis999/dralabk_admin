const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

const uniqueValidator = require( 'mongoose-unique-validator' );

class PaymentModel {


    initSchema() {
        const schema = new Schema( {
            'payment_id': {
                'type': String,
                'immutable': true
            },
            'user_id': {
                'type': String,
                'immutable': true
            },
            'order_id': {
                'type': String,
                'default': 'PENDING'
            },
            'Id': {
                'type': String
            },
            'payment_details': {
                'type': Object
            },
            'merchant': {
                'type': String
            }
        }, { 'timestamps': true } );

        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'payment', schema );
        } catch ( e ) {
            
        }
    };

    
    getInstance() {
        this.initSchema();
        return mongoose.model( 'payment' );
    };

    
};

const Payment = new PaymentModel().getInstance();

module.exports = { Payment, PaymentModel };
