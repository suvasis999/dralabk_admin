const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

const uniqueValidator = require( 'mongoose-unique-validator' );

class OrderModel {

    initSchema() {
        const schema = new Schema( {
            'order_id': {
                'type': String,
                'immutable': true
            },
            'payment_id':{
                'type': String,
                'default': ''
            },
            'parchause_details': {
                'parchause_type': { 'type': String, 'immutable': true },
                'course_id': { 'type': String, 'immutable': true, 'default': '' }
            },
            'amount': {
                'type': String
            },
            'user_id': {
                'type': String,
                'immutable': true
            },
            'status': {
                'type': String,
                'default': 'PENDING'
            },
            'order_details': {
                'type': Object
            },
            'merchant': {
                'type': String
            }
        }, { 'timestamps': true } );

        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'order', schema );
        } catch ( e ) {
            
        }
    };

    
    getInstance() {
        this.initSchema();
        return mongoose.model( 'order' );
    };

    
};

const Order = new OrderModel().getInstance();

module.exports = { Order, OrderModel };
