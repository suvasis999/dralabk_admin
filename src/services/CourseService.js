'use strict';
const { Service } = require( '../../system/services/Service' );
const mongoose = require( 'mongoose' );
const { HttpError } = require( '../../system/helpers/HttpError' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const { Course } = require( '../models/Course' );
const { quizService } = require( '../services/QuizService' );

class CourseService extends Service {


    constructor( model, quizServiceDependecy ) {
        super( model );
        this.quizService = quizServiceDependecy;
    }

    async get( id, query = {} ) {
        try {
            console.log(id);
            let { projection, search } = query;

            search = search ? search : {};

            projection = projection ? projection : {};
            const item = await this.model.findById( { '_id': id, ...search }, projection ).populate( 'pictures', 'path filename' ).populate('author');

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

    async getAllByArrayOfIds( query, arrayOfIds, operation = 'include' ) {
        let { skip, limit, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        projection = projection ? projection : {};


        delete query.projection;
        delete query.skip;
        delete query.limit;
        delete query.sortBy;

        if ( query._id ) {
            try {
                query._id = new mongoose.mongo.ObjectId( query._id );
            } catch ( error ) {
                throw new Error( 'Not able to generate mongoose id with content' );
            }
        }

        try {

            if( operation == 'exclude' ) {
                const items = await this.model
                        .find( query, projection )
                        .where( '_id' )
                        .nin( arrayOfIds )
                        .sort( sortBy )
                        .skip( skip )
                        .limit( limit ).populate( 'author', 'email name last_name' ).populate( 'pictures', 'path filename' ),
                    total = await this.model.countDocuments( query ).where( '_id' ).nin( arrayOfIds );

                return { 'items': items, 'totalCount': total };

            }

            if( operation == 'include' ) {
                const items = await this.model
                        .find( query, projection )
                        .where( '_id' )
                        .in( arrayOfIds )
                        .sort( sortBy )
                        .skip( skip )
                        .limit( limit ).populate( 'author', 'email name last_name' ).populate( 'pictures', 'path filename' ),
                    total = await this.model.countDocuments( query ).where( '_id' ).in( arrayOfIds );

                return { 'items': items, 'totalCount': total };

            }
            
        } catch ( errors ) {
            throw errors;
        }
    }

    async getUserOnCourseOperation( userDoc, courseDoc ) {

        // need to be bought
        // free => no transaction
        // paid => transaction
        const userId = userDoc._id.toString();
        const notDonePreRequisites = [];
        const donePreRequisites = [];
        
        courseDoc[ 'pre_requisites' ].forEach( ( preReq ) => {
            
            if( userDoc[ 'completed_courses' ].get( preReq.course_id.toString() ) ) {
                donePreRequisites.push( preReq );
                return;
            }

            notDonePreRequisites.push( preReq );
        
        } );

        const isOwned = courseDoc[ 'on_going_users' ].get( userId.toString() ) || courseDoc[ 'completed_users' ].get( userId.toString() );


        if( isOwned ) {
            return { 'userOnCourseOperation': 'OWNED', 'courseDetails': courseDoc };
        }
        if( notDonePreRequisites.length ) {

            return { 'userOnCourseOperation': 'PRE_REQUISITES_NOT_DONE', 'donePreRequisites': donePreRequisites, 'undonePreRequisites': notDonePreRequisites, 'courseDetails': courseDoc };
        }
        if( courseDoc.price == 0 ) {
            return { 'userOnCourseOperation': 'GET_FOR_FREE', 'courseDetails': courseDoc };
        }

        if( courseDoc.price > 0 ) {
            return { 'userOnCourseOperation': 'GET_FOR_DONATION', 'courseDetails': courseDoc };
        }
    
    }
    async getAll( query ) {
        let { skip, limit, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        projection = projection ? projection : {};


        delete query.projection;
        delete query.skip;
        delete query.limit;
        delete query.sortBy;

        if ( query._id ) {
            try {
                query._id = new mongoose.mongo.ObjectId( query._id );
            } catch ( error ) {
                throw new Error( 'Not able to generate mongoose id with content' );
            }
        }

        try {
            const items = await this.model
                    .find( query, projection )
                    .sort( sortBy )
                    .skip( skip )
                    .limit( limit ).populate( 'author', 'email name last_name' ).populate( 'pictures', 'path filename' ),
                total = await this.model.countDocuments( query );

            return { 'items': items, 'totalCount': total };
        } catch ( errors ) {
            throw errors;
        }
    }

    async addSection( courseId, section ) {
        try {
            const course = this.updateArray( courseId, 'sections', section );

            return course;
        } catch ( error ) {
            throw error;
        }
    
    }
    async addContent( courseId, sectionId, content ) {
        try {
            const course = await this.get( courseId );

            await course.addContent( sectionId, content );

            return course;
        } catch ( error ) {
            throw error;
        }
    };
    
    async patchSection( courseId, sectionId, newSectionData ) {
        try {
            delete newSectionData[ '_id' ];
            return await this.model.modifySection( courseId, sectionId, newSectionData );
        } catch ( error ) {
            throw error;
        }
    }

    async patchContent( courseId, sectionId, contentId, newContentData ) {
        try {
            delete newContentData[ '_id' ];
            return await this.model.modifyContent( courseId, sectionId, contentId, newContentData );
        } catch ( error ) {
            throw error;
        }
    }

    async deleteSection( courseId, sectionId ) {
        try {
            const response = await this.model.deleteSection( courseId, sectionId );

            if( !response ) {
                const error = new HttpError( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }
            return response.sections.find( ( section ) => section._id == sectionId );
        } catch ( error ) {
            throw error;
        }

    };

    async publishCourse( courseDoc, userRole ) {
        try {
            if( courseDoc.isLive == true || courseDoc.isTemp == true ) {
                
                const error = new Error( 'You can only publish freshly created courses' );

                error.statusCode = 409;
                throw error;
            }


            // assimilate all of the confliclts errors;
            let conflictErrors = [];

            if ( !courseDoc.quiz ) {
                const error = 'You need to add a quiz to course in order to publish it';

                conflictErrors.push( error );
            }

            if( userRole == 'admin' ) {
                if( !courseDoc.accoumplishments ) {
                    const error = 'You need to add accoumplishemnts in order to publish the course';

                    conflictErrors.push( error );
                }
                courseDoc.isLive = true;
            }
            
            if( userRole == 'instructor' ) {
                courseDoc.isPublished = true;
            }

            if( conflictErrors.length > 0 ) {
                const error = new Error( 'Course does not meet publishing requirements' );
                
                error.statusCode = 409;
                error.errors = conflictErrors;
                throw error;
            }

            await courseDoc.save();
            return courseDoc;
        } catch ( error ) {
            throw error;
        }
        
    }
    
    async approvePublishedCourse( courseDoc ) {
        try{
            if( courseDoc.isPublished == false ) {
                
                const error = new Error( 'You cant approve publishing course for courses that need to be published' );

                error.statusCode = 409;
                throw error;
            }else{
                courseDoc.isLive = true;
                courseDoc.isPublished = false;
                await courseDoc.save();
                return courseDoc;
            }
        }catch( error ) {
            next( error );
        }
    }

    async getPublishedCourses( page, perPage ) {
        const items = await this.model
            .find( { 'isPublished':true } )
            .limit( perPage )
            .skip( perPage * page );
    }

    async deleteContent( courseId, sectionId, contentId ) {
        try{
            return await this.model.deleteContent( courseId, sectionId, contentId );
        } catch ( error ) {
            throw error;
        }
    }
    async insertQuiz( courseId, data ) {
        try {
            const quize = await this.quizService.insert( data );
            const quizeId = quize[ '_id' ];

            const course = await this.get( courseId );

            await course.insertQuiz( quizeId );

            return course;
        } catch ( error ) {
            throw error;
        }

    }

    async findById( id ) {
        return this.model.findById( id );
    }

    // need to add a function for verifying if the course is live
    async startEditingCourse( courseId ) {
        const originalCourse = await this.get( courseId );
        const clonedCourseRef = originalCourse[ 'temp_object_for_change' ];


        if( !( originalCourse[ 'isTemp' ] == false && originalCourse[ 'isLive' ] == true ) ) {
            const error = new HttpResponse('Course does not meet the requirments for start editing functionnality ' );

            error.statusCode = 409;
            
            throw error;
        }
        
        
        if( clonedCourseRef == undefined ) {
            const newId = mongoose.Types.ObjectId();

            originalCourse[ 'temp_object_for_change' ] = newId;
            originalCourse[ 'temp' ] = 'not';
            
            
            const data = originalCourse.toObject();

            data._id = newId;
            data[ 'temp' ] = 'yes';
            data.isNew = true;
            data.isTemp = true;
            data.isLive = false;
            
            
           
            
            const editedCourse = await this.insert( data );
            await originalCourse.save();

            return editedCourse;


        }
        
        if( clonedCourseRef ) {
            return await this.get( clonedCourseRef );
        }

    }

    
    // a function for courses recommended for you.

    // a function for upcoming courses

    // a function for free courses

    // a function for editing the courses
}

const courseService = new CourseService( Course, quizService );

module.exports = { CourseService, courseService };
