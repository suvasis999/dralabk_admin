'use strict';
/* eslint-disable */
const { Service } = require( '../../system/services/Service' );
const { courseService } = require( '../services/CourseService' );
const { userService } = require( '../services/UserService');


const { CourseProgressStats } = require( '../models/CourseProgressStats' );
const { LoginStats } = require( '../models/Login')
const { User } = require( '../models/User')


const { getDayStartEnd, getPreviousDay, dayMonthYear } = require( '../../system/helpers/Date' );
const { default: mongoose } = require('mongoose');

class CourseProgressStatsService extends Service {

    constructor( model ) {
        super( model );
    }


    async getAdminUserStatistics(searchDate) {

      const todayBuffer = new Date();

      const yesterDayBuffer = getPreviousDay( todayBuffer );

      const today = { ...getDayStartEnd( todayBuffer ) };
      const yesterDay = { ...getDayStartEnd( yesterDayBuffer ) };

      const searchDay = { ...getDayStartEnd(searchDate)};
      
      const searchStart = searchDay.start;
      const searchEnd = searchDay.end;

      const usersIndicators = await User.aggregate([
          // get only last 2 days results
          {
              "$match": {
                "createdAt": {
                  "$gte": yesterDay.start,
                  "$lte": today.end
                }     
              }
          },
          // count results by date and type
          {
              $group: {
                _id: {
                  createdAt: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$createdAt"
                    }
                  }},
                count: {
                  $sum: 1
                }
              }
            }
      ]
      )

      const registredMemebersCount = await User.countDocuments( );
      
      const membersIndicator = usersIndicators.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? usersIndicators.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - usersIndicators.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? usersIndicators.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0

      const membersStatis = { membersIndicator, registredMemebersCount };

      const loginGraphData = await LoginStats.aggregate([
          {
              "$match": {
                "createdAt": {
                  "$gte": searchStart,
                  "$lte": searchEnd
                }     
              }
          },    
          {
              $group: {
                _id: {
                  createdAt: {
                    $dateToString: {
                      format: "%Y-%m-%d %H",
                      date: "$createdAt"
                    },
                  }
                  },
                count: {
                  $sum: 1
                }
              }
           },

           { '$sort':{'_id.createdAt':1} }

          
      ]
      );

      return { membersStatis, loginGraphData } ;
  
  }

    async getCourseProgressStatistics(searchDate) {
        const todayBuffer = new Date();

        const yesterDayBuffer = getPreviousDay( todayBuffer );

        const today = { ...getDayStartEnd( todayBuffer ) };
        const yesterDay = { ...getDayStartEnd( yesterDayBuffer ) };

        const searchDay = { ...getDayStartEnd(searchDate)};

        const searchStart = searchDay.start;
        const searchEnd = searchDay.end;

        const coursesIndicatorsResponse = await this.model.aggregate([
            // get only last 2 days results
            {
                "$match": {
                  "createdAt": {
                    "$gte": yesterDay.start,
                    "$lte": today.end
                  }     
                }
            },
            // count results by date and type
            {
                $group: {
                  _id: {
                    createdAt: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                      }
                    },
                    status: "$status"
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
        ]
        )

        const completedCourseStats = await this.model.aggregate([
            {
                "$match": {
                  "createdAt": {
                    "$gte": searchStart,
                    "$lte": searchEnd
                  }     
                }
            },
            {
                "$match": {
                  "status":"COMPLETED" 
                }
            },
            {'$project': {'createdAt':1}},

            {
                $group: {
                  _id: {
                    createdAt: {
                      $dateToString: {
                        format: "%Y-%m-%d %H",
                        date: "$createdAt"
                      }
                    },
                    status: "$status"
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
            ,{'$sort':{'createdAt':1}},
        ]
        );

        const onGoingCourseStats = await super.getAll( {'status':'ON_GOING', 'sortBy':{'createdAt':1}, 'projection': 'createdAt' } ) ;
        const completedCoursesCount = await super.getAll( {'status':'COMPLETED', 'sortBy':{'createdAt':1}, 'projection': 'createdAt' } );
        
        const completedIndicatorArray = coursesIndicatorsResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'COMPLETED' );
        const completedIndicator = completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) ).length > 0 ? completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0

        const onGoingndicatorArray = coursesIndicatorsResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'ON_GOING' );
        const onGoingndicator = onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) ).length > 0 ? onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0

        const coursesStats = {onGoingndicator,completedIndicator,'completedCoursesCount':completedCoursesCount.totalCount,'onGoingCoursesCount': onGoingCourseStats.totalCount};
        const completedCoursesGraphData = completedCourseStats;
        console.log(coursesStats);
        //const ongGoingCoursesGraphData = onGoingCourseStats.items;
        return {coursesStats,completedCoursesGraphData};
    }

    // get stats for user
    async getProgressForUser(userId){
        const todayBuffer = new Date();

        const yesterDayBuffer = getPreviousDay( todayBuffer );

        const today = { ...getDayStartEnd( todayBuffer ) };
        const yesterDay = { ...getDayStartEnd( yesterDayBuffer ) };

        const userIdObjectType = userId;


        const coursesIndicatorsResponse = await this.model.aggregate([
            {
                "$match": {
                    "$and": [   {'learner': userIdObjectType },
                                {"createdAt": {
                                    "$gte": yesterDay.start,
                                    "$lte": today.end
                                     }
                                }
                            ]
                    }
            },
            {
                $group: {
                  _id: {
                    createdAt: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                      }
                    },
                    status: "$status"
                  },
                  count: {
                    $sum: 1
                  }
                }
            }
        ]
        )

        const coursesCountResponse = await this.model.aggregate([
            {
                "$match": {
                    'learner': userIdObjectType
                }
            },
            {
                $group: {
                    _id: {
                    status: "$status"
                    }
                  ,
                  count: {
                    $sum: 1
                  }
                }
            }
            
            ])

        const completedCoursesCount = coursesCountResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'COMPLETED' ).length > 0 ?  coursesCountResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'COMPLETED' )[ 0 ].count : 0; 
        const onGoingCoursesCount = coursesCountResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'ON_GOING' ).length > 0 ?  coursesCountResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'ON_GOING' )[ 0 ].count : 0; 


        const completedIndicatorArray = coursesIndicatorsResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'COMPLETED' );
        const completedIndicator = completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? completedIndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0

        const onGoingndicatorArray = coursesIndicatorsResponse.filter( (group) => group[ '_id' ][ 'status' ] == 'ON_GOING' );
        const onGoingndicator = onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? onGoingndicatorArray.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0

        const coursesStats = {onGoingndicator,completedIndicator,'completedCoursesCount':completedCoursesCount,'onGoingCoursesCount': onGoingCoursesCount};

        return coursesStats;
    }



    // get stats for instructor
    async getInstructorStats(instructorId){

        const todayBuffer = new Date();

        const yesterDayBuffer = getPreviousDay( todayBuffer );

        const today = { ...getDayStartEnd( todayBuffer ) };
        const yesterDay = { ...getDayStartEnd( yesterDayBuffer ) };

        const userIdObjectType = instructorId;


        const registredIndicatorResponse = await this.model.aggregate([
            {
                "$match": {
                    '$and': [   {'owner': userIdObjectType },
                                {'status': 'ON_GOING'},
                                {"createdAt": {
                                    "$gte": yesterDay.start,
                                    "$lte": today.end
                                     }
                                }
                            ]
                    }
            },
            {
                $group: {
                  _id: {
                    createdAt: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                      }
                    },
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
        ]
        )

        const createdCoursesIndicatorResponse = await courseService.model.aggregate([
            {
                "$match": {
                    '$and': [   {'owner_id': userIdObjectType },
                                {'isLive': true},
                                {'isTemp': false},
                                {"createdAt": {
                                    "$gte": yesterDay.start,
                                    "$lte": today.end
                                     }
                                }
                            ]
                    }
            },
            {
                $group: {
                  _id: {
                    createdAt: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                      }
                    },
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
        ])

        const registredIndicator = registredIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? registredIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - registredIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? registredIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0
        const createdCoursesIndicator = createdCoursesIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? createdCoursesIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) )[ 0 ]['count'] : 0 - createdCoursesIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(todayBuffer ) ).length > 0 ? createdCoursesIndicatorResponse.filter( (group) => group[ '_id' ][ 'createdAt' ] == dayMonthYear(yesterDayBuffer ) )[ 0 ]['count'] : 0
        const createdCoursesCount = await courseService.model.count({ '$and': [ {'owner_id': userIdObjectType },{'isLive': true},{'isTemp': false} ] } );
        const registredCount = await this.model.count(  { '$and': [ {'owner': userIdObjectType } ] } );


        return {registredIndicator,createdCoursesIndicator,createdCoursesCount,registredCount}

    }


    async getBy( query = {} ) {
        try {
            let { projection, search } = query;

            search = search ? search : {};
            projection = projection ? projection : {};

            const item = await this.model.findOne( { ...search }, projection );

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


    async update( query = {}, data ) {

        const search = query ? query : [];

        try {
            const item = await this.model.updateOne( search, data, { 'new': true, 'runValidators': true, 'context': 'query' } );

            return item ;
        } catch ( errors ) {
            throw errors;
        }
    }

    async getAll( query ) {

        let { skip, limit, page, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        page = page ? Number( page ) : 0;
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
            
            const sortByKey = Object.keys( sortBy )[ 0 ];
            let sortByObject = null;

            if( sortBy.hasOwnProperty( 'last_name' ) || sortBy.hasOwnProperty( 'email' ) || sortBy.hasOwnProperty( 'role' ) || sortBy.hasOwnProperty( 'status' ) || sortBy.hasOwnProperty( 'last_login' ) ) {
                sortByObject = {};
                sortByObject[ `learner_object.${sortByKey}` ] = Number( sortBy[ sortByKey ] );
            }

            if( sortBy.hasOwnProperty( 'name' ) ) {
                sortByObject = {};
                sortByObject[ `course_object.${sortByKey}` ] = Number( sortBy[ sortByKey ] );

            }

            if( sortBy.hasOwnProperty( 'amount' ) ) {
                sortByObject = {};
                sortByObject[ `${sortByKey}` ] = Number( sortBy[ sortByKey ] );
            }

            const sort = sortByObject ? {'$sort': sortByObject } : null ;

            const agregationPipLines = [
                { '$match': query },
                { '$lookup': {
                    'from': 'users',
                    'localField': 'learner',
                    'foreignField': '_id',
                    'as': 'learner_object'
                }
                },
                { '$lookup': {
                    'from': 'courses',
                    'localField': 'course',
                    'foreignField': '_id',
                    'as': 'course_object'
                }
                },
                { '$unwind': '$learner_object' },
                { '$unwind': '$course_object' },
                sort,
                { '$project': {
                    'course_object.name': 1,
                    'amount': 1,
                    'learner_object._id': 1,
                    'learner_object.name': 1,
                    'learner_object.email': 1,
                    'learner_object.status': 1,
                    'learner_object.last_name': 1,
                    'learner_object.last_logout_date': 1,
                    'learner_object.role': 1,

                }
                },
                { '$facet': {
                    metadata: [ { $count: "total" }, { $addFields: { page: page } } ],
                    data: [ { $skip: skip }, { $limit: limit } ]
                } },
                
            ];

            if( !agregationPipLines[ 5 ] ) {
                agregationPipLines.splice( 5, 1 );
            }


            const items = await this.model.aggregate( agregationPipLines
            );


            return { 'items': items[ 0 ].data, 'totalCount': items[ 0 ].metadata[ 0 ] ? items[ 0 ].metadata[ 0 ].total : 0 };
            

        } catch ( errors ) {
            throw errors;
        }
    }


}

const courseProgressStatsService = new CourseProgressStatsService( CourseProgressStats );

module.exports = { CourseProgressStatsService, courseProgressStatsService };
