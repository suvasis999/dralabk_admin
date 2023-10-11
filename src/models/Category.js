const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );

class CategoryModel {

    initSchema() {

        const schema = new Schema( {
            'category_name': {
                'type': String,
                'unique': true
            },
        }, { 'timestamps': true } );

        schema.index(
            { 'category_name': 1  },
        );

        try {
            mongoose.model( 'category', schema );
        } catch ( e ) {

        }


    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'category' );
    }

    
}
const Category = new CategoryModel().getInstance();

module.exports = { Category };
