const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

const uniqueValidator = require( 'mongoose-unique-validator' );


class TransactionModel {

    initSchema() {
        const schema = new Schema( {
            'from': {
                'type': Schema.Types.ObjectId, 'ref': 'user',
                'immutable': true
            },
            'to': {
                'type': Schema.Types.ObjectId, 'ref': 'user',
                'immutable': true
            },
            'status': {
                'type': String,
                'default': 'PENDING'
            },
            'amount': {
                'type': Number
            },
            'transaction_type': {
                'type': String
            },
            'perchaused_item': {
                'type': String,
                'default': 'donation'
            },
            'payout_date': {
                'type': Date,
                'default': null,
            }
        }, { 'timestamps': true } );

        schema.index(
            { 'from': 1 },
        );
        schema.index(
            {  'to': 1  },
        );
        schema.index(
            { 'transaction_type':1  }
        );
        schema.index(
            { 'status': 1, 'amount':1,'payout_date':1 }
        );
        schema.plugin( uniqueValidator );
        
        try {
            mongoose.model( 'transaction', schema );
        } catch ( e ) {
            
        }
    };

    
    getInstance() {
        this.initSchema();
        return mongoose.model( 'transaction' );
    };

    
};

const Transaction = new TransactionModel().getInstance();

module.exports = { Transaction, TransactionModel };
