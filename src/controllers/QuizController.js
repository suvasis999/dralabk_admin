const { Controller } = require( '../../system/controllers/Controller' );
const { quizService } = require( './../services/QuizService' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const autoBind = require( 'auto-bind' );
const { notificationController } = require('./Notifications');

class QuizController extends Controller {

    constructor( service ) {
        super( service );
        autoBind( this );
    }

    async insert( req, res, next ) {
        if( req.user.role != 'admin' && req.user.role != 'instructor' ){
            const error = new Error( 'Unauthorized' );

            error.statusCode = 401;
            throw error;
        }
   
        const data = req.body;
        data.owner_id = req.user[ '_id' ].toString();
    }

    async update( req,res,next ){
        const quizId = req.params.id
        try{
            await super.update(req,res,next);
        if(req.user.role == 'instructor') {
            notificationController.insertInstructorQuizModification(quizId);
        }
        if(req.user.role == 'admin'){
            notificationController.insertAdminQuizModification(quizId);
        }}

        catch(error){
            console.log(error);
        }
    }
    
    async getQuestions( req, res, next ) {
        try{
            const quizId = req.params.id;

            let quiz = this.service.get( quizId );

            if( quiz.type == 'Multiple choice' ) {
                quiz = quiz.toObject();
                quiz.multiple_choice_questions.forEach( ( quiz ) => {
                    quiz.answer = null;
                }
                );
            }
            if( quiz.type == 'True False' ) {
                quiz = quiz.toObject();
                quiz.true_false_questions.forEach( ( quiz ) => {
                    quiz.answer = null;
                }
                );
            }

            return res.status( 200 ).json( new HttpResponse( quiz ) );
            
        }catch( error ) {
            next( error );
        }
    }

}

module.exports = new QuizController( quizService );
