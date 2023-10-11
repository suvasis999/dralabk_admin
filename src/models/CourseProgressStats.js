const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );

class CourseProgressStatsModel {

    initSchema() {

       
        const schema = new Schema( {
            'owner': {
                'type': Schema.Types.ObjectId, 'ref': 'user',
                'required': true,
            },
            'course': {
                'type': Schema.Types.ObjectId, 'ref': 'course',
                'required': true,
            },
            'learner': {
                'type': Schema.Types.ObjectId, 'ref': 'user',
                'required': true,
            },
            'status': {
                'type': String,
                'enum': [ 'ON_GOING', 'COMPLETED' ],
            },
            'amount': {
                'type': Number,
            }
        }, { 'timestamps': true } );

        schema.index({'createdAt':1,'status':1});
        schema.index({'course':1});
        schema.index({'owner':1});
        schema.index({'learner':1});
        
        schema.plugin( uniqueValidator );
        try {
            mongoose.model( 'courseprogressstats', schema );
        } catch ( e ) {
            
        }

      
    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'courseprogressstats' );
    }
    
    
}

const CourseProgressStats = new CourseProgressStatsModel().getInstance();

module.exports = { CourseProgressStats, CourseProgressStatsModel };
