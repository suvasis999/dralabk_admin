const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );

class QuizModel {


    initSchema() {

        const schema = new Schema( {
            'type': {
                'type': String,
                'enum': [ 'Multiple choice', 'True False' ],
                'required': true,
            },
            'owner_id':{
                'type': String,
                'required':true,
            },
            'course':{
                'type': Schema.Types.ObjectId,
                'ref': 'course',
                'required':true,
                'unique':true
            }
            ,
            'passing_score': {
                'type': Number,
                'required': true,
                'min': [ 70, 'Passing score should be greater than 70' ],
                'max': [ 100, 'Passing score should be lesser than 100' ]
            },
            'questions_number': {
                'type': Number,
                'required': true,
            },
            'multiple_choice_questions': {
                'type': [ { 'question': [ String ], 'answers': [ String ], 'answer': Number } ],
            },
            'true_false_questions': {
                'type': [ { '_id': false, 'question': String, 'answers': [ Boolean ], 'answer': Number } ] } },
            { 'timestamps': true } );
            
            schema.index(
                { 'owner_id': 1  },
            );
    
        
        // eslint-disable-next-line prefer-arrow-callback
        const validate = ( next, data ) => {
            if ( !data.type ) {
                throw Error( 'Level:Model, You should specify the type field' );
            }
            if( data.type == 'Multiple choice' ) {
                if( !data[ 'multiple_choice_questions' ] ) {
                    throw Error( 'Level:Model, Questions of multiple_choice_questions are required' );
                }
                if( data[ 'multiple_choice_questions' ].length != data[ 'questions_number' ] ) {
                    throw Error( 'Level:Model, number of questions should match questions_number field' );
                }
                data[ 'multiple_choice_questions' ].forEach( ( question ) => {
                    if( question[ 'answer' ] >= question.answers.length ) {
                        throw Error( 'answer field should contain a number that is lesser than answers length' );
                    }
                }
                );
            }
            if( data.type == 'True False' ) {
                if( !data[ 'true_false_questions' ] ) {
                    throw Error( 'Level:Model, Questions of type true_false_questions are required' );
                }
                if( data[ 'true_false_questions' ].length != data[ 'questions_number' ] ) {
                    throw Error( 'Level:Model, number of questions should match questions_number field' );
                }
            }
            next();
        };

        schema.pre( 'validate', async function( next ) {
            validate( next, this );
        }
        );
        schema.pre( 'findOneAndUpdate', async function( next ) {
            validate( next, this._update );
        }
        );


        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'quiz', schema );
        } catch ( e ) {

        }
    }

    getInstance() {
        this.initSchema();
        return mongoose.model( 'quiz' );
    }
}

const Quiz = new QuizModel().getInstance();

module.exports = { Quiz, QuizModel };
