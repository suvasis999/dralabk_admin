'use strict';
const { Service } = require( '../../system/services/Service' );
const { Quiz } = require( '../models/Quiz' );

class QuizService extends Service {
    constructor( model ) {
        super( model );
    }
    async get( id, query = {} ) {
        try {
            let { projection, search } = query;

            search = search ? search : {};

            projection = projection ? projection : {};
            const item = await this.model.findById( { '_id': id, ...search }, projection ).populate('course', 'name');

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            return item;
        } catch ( errors ) {
            throw errors;
        }
    }
}

const quizService = new QuizService( Quiz );

module.exports = { QuizService, quizService };
