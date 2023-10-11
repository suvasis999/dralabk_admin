const mongoose = require( 'mongoose' );
const { Schema } = require( 'mongoose' );
const uniqueValidator = require( 'mongoose-unique-validator' );
const { categoryService } = require( '../services/CategoryService' );

class CourseModel {

    initSchema() {
        const letterSchema = new Schema( {
            '_id': false,
            'textEditor': {
                'type': { String, 'required': true },
            
            }
        }
        );

        const certificateSchema = new Schema( {
            '_id': false,
            'title': { 'type': String, 'required': true },
            'mainText': { 'type': String, 'required': true },
            'firstParagraph': { 'type': String, 'required': true },
            'secondParagraph': { 'type': String, 'required': true },
        }
        );

        const accomplishmentSchema = new Schema( {
            'certificate': {
                'type': certificateSchema,
            },
            'letter': {
                'type': letterSchema,
            }
        } );

        const contentSchema = new Schema( {
            'type': {
                'type': String,
                'enum': [ 'video', 'content' ],
                'required': true,
            },
            'title': {
                'type': String,
                'required': true,
            },
            'content': {
                'type': String,
                'required': false,
            }
        } );
        
        const SectionSchema = new Schema( {
            'title': {
                'type': String,
                'required': true,
                'unique': false
            },
            'contents': {
                'type': [ contentSchema ],
                'default': null,
                'required': false,
            }
        } );
       
        const schema = new Schema( {
            'name': {
                'type': String,
                'required': true,
                'unique': false,
            },
            'owner_id': {
                'type': Schema.Types.ObjectId, 'ref': 'user',
                'required': true,
            },
            'category': {
                'type': String,
                'required': true,
            },
            'description': {
                'type': String,
                'required': true,
            },
            'pictures': {
                'type': [ { 'type': Schema.Types.ObjectId, 'ref': 'media' } ],
                'required': true,
            },
            'sections': {
                'type': [ SectionSchema ],
                'required': false,
                'unique': false,
            },
            'price': {
                'type': Number
            },
            'quiz': {
                'type': Schema.Types.ObjectId, 'ref': 'quiz',
                'default': null
            },
            'isLive': {
                'type': Boolean,
                'default': false
            },
            'isTemp': {
                'type': Boolean,
                'default': false
            },
            'temp':{
                'type': String,
                'default': 'not'
            }
            ,
            'isPublished': {
                'type': Boolean,
                'default': false
            },
            'isChangeBlocked': {
                'type': Boolean,
                'default': false
            },
            'isCompleted': {
                'type': Boolean,
                'default': false
            },
            'accoumplishments': {
                'type': accomplishmentSchema,
                'default': null
            },
            'on_going_users': {
                'type': Map,
                'default': new Map()
            },
            'completed_users': {
                'type': Map,
                'default': new Map()
            },
            'temp_object_for_change': {
                'type': Schema.Types.ObjectId, 'ref': 'course',
            },
            'pre_requisites': [ {
                'course_id': String,
                'course_name': { 'type': String },
                '_id': false
            }
            ]
        }, { 'timestamps': true } );

        schema.index(
            { 'isTemp': 1, 'name': 1 }, 
            { unique: true } 
        );

        schema.index(
            { 'isLive': 1, 'isTemp': 1, 'isPublished': 1, 'isChangeBlocked':1  },
        );
        
        
        schema.index(
            { 'owner_id': 1  },
        );

        schema.index(
            { 'price': 1  },
        );


        schema.set( 'toObject', { 'virtuals': true } );
        schema.set( 'toJSON', { 'virtuals': true } );

        
        schema.virtual( 'author', {
            'ref': 'user',
            'localField': 'owner_id',
            'foreignField': '_id',
            'justOne': true
        }
        );

        schema.methods.addSection = async function( section ) {
            this.sections.push( section );
            await this.save( { 'validateModifiedOnly': true } );
        };

        schema.statics.modifySection = async function( courseId, sectionId, sectionData ) {
            const set = {};

            for ( const field in sectionData ) {
            
                set[ 'sections.$.' + field ] = sectionData[ field ];
            
            }
            return await this.findOneAndUpdate( { '_id': courseId, 'sections._id': sectionId }, { '$set': set }, { 'new': true } );

        };

        schema.statics.deleteSection = async function( courseId, sectionId ) {
            return await this.findOneAndUpdate( { '_id': courseId }, { '$pull': { 'sections': { '_id': sectionId } } }, { 'new': false } );
        };
    
        schema.methods.addContent = async function( sectionId, content ) {
            const sectionIndex = this.sections.findIndex( ( section ) => section[ '_id' ] == sectionId );

            this.sections[ sectionIndex ].contents.push( content );
            await this.save( { 'validateModifiedOnly': true } );
        };

        schema.statics.modifyContent = async function( courseId, sectionId, contentId, contentData ) {
            let set = {};

            for ( const field in contentData ) {
            
                set[ 'sections.$[sectionId].contents.$[contentId].' + field ] = contentData[ field ];
            
            }

            return await this.findOneAndUpdate(
                { _id: courseId },
                { $set : set },
                { arrayFilters:
                  [
                    {"sectionId._id": sectionId},
                    {"contentId._id": contentId} 
                  
                  ]
                  
                }
                )
        };

        schema.statics.deleteContent = async function( courseId, sectionId, contentId ) {
            return await this.findOneAndUpdate(
                { _id: courseId },
                { $pull :  {'sections.$[sectionId].contents': {'_id':contentId }}},
                { arrayFilters:
                  [
                    {"sectionId._id": sectionId},
                  
                  ]
                  
                }
                )
        };
        schema.methods.insertQuiz = async function( quizId ) {
            this.quiz = mongoose.Types.ObjectId( quizId ) ;;
            await this.save( { 'validateModifiedOnly': true } );
        };

        schema.methods.delete = async function() {
            const id = this[ '_id' ];
            
            return mongoose.model( 'course' ).findByIdAndDelete( id );
        };
        schema.plugin( uniqueValidator );

        try {
            mongoose.model( 'course', schema );
        } catch ( e ) {
            
        }

      
    }


    getInstance() {
        this.initSchema();
        return mongoose.model( 'course' );
    }
    
    
}

const Course = new CourseModel().getInstance();

module.exports = { Course, CourseModel };
