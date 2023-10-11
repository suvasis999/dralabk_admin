/* eslint-disable prefer-arrow-callback */
const { authenticateUser } = require( './Authentication' );

const { quizService } = require( '../services/QuizService' );
const { courseService } = require( '../services/CourseService' );
const { courseProgressStatsService } = require( '../services/StatsService' );
const { notificationController } = require('../controllers/Notifications');

const setQuizSocketHandlers = ( nameSpace ) => {


    nameSpace.use( authenticateUser ).on( 'connection', async( socket ) => {

        const exam = { 'isTakingQuiz': false, 'timeLimit': null, 'isDone': false, 'questionsNumber': 0, 'questions': [ {} ], 'currentQuestion': 0, 'correctAnswersCount': 0, 'passingScore': 0 };
        
        let progressDoc = {};


        socket.on( 'startExam', async function( req ) {

            // eslint-disable-next-line no-param-reassign

            const body = JSON.parse( req );
            const quizId = body[ 'quiz_id' ];
            const courseId = body[ 'course_id' ];

            progressDoc = socket.userDoc.progress_array.find( ( progress ) =>
            {
                return progress.course.toString() == courseId;
            } );
            
                if( !progressDoc || progressDoc[ 'is_eligible_for_quiz' ] == false ) {
                socket.emit( 'failed', { 'error': ' Unauthorized' } );
                return;
            }
            try {
                const quiz = await quizService.get( quizId );

                if ( !quiz ) {

                    socket.emit( 'failed', { 'error': ' No quiz to added ' } );
                    return;

                }

                if ( exam.isTakingQuiz ) {
                    socket.emit( 'failed', { 'error': 'You are already taking a quiz ' } );
                    return;

                }

                if( quiz ) {
                    exam.isTakingQuiz = true;
                    exam.questionsNumber = quiz[ 'questions_number' ];
                    exam.passingScore = quiz[ 'passing_score' ];
                    if( quiz.type == 'True False' ) {
                        exam.questions = quiz[ 'true_false_questions' ];
                    }else{
                        exam.questions = quiz[ 'multiple_choice_questions' ];
                    }
                        
                    socket.emit( 'start', { 'quizLength': exam.questionsNumber } );

                }
            }catch( error ) {
                socket.emit( 'failed', { 'error': ' Quiz could not be fetched' } );
            }
        }
   
        );

        socket.on( 'getQuestion', function( ) {

            if( exam.isTakingQuiz == false ) {
                socket.disconnect();
                return;
            }
            const currentQuestion = exam.currentQuestion;

            socket.emit( 'question', { 'operation': 'question', 'question': exam.questions[ currentQuestion ].question, 'answers': exam.questions[ currentQuestion ].answers, 'currentQuestion': currentQuestion } );

        }
        );

        socket.on( 'sendAnswer', async function( req ) {
            if( exam.isTakingQuiz == false ) {
                socket.disconnect();
                return;
            }
            const requestBody = req ;
            const answer = requestBody.answer ? requestBody.answer : '' ;
            const currentQuestion = exam.questions[ exam.currentQuestion ];

            if( answer.toString() == currentQuestion.answers[ currentQuestion.answer ].toString() ) {
                exam.correctAnswersCount += 1;
                socket.emit( 'answered', { 'operation': 'answered' } );
            }else{
                socket.emit( 'answered', { 'operation': 'answered' } );
            }
            
            if( exam.isTakingQuiz ) {
                if( exam.currentQuestion == exam.questionsNumber - 1 ) {
                    const score = ( exam.correctAnswersCount / exam.questionsNumber ) * 100;

                    socket.emit( 'finished', { 'score': score, 'passingScore': exam.passingScore, 'result': score >= exam.passingScore ? 'passed' : 'failed' } );
                    if( progressDoc[ 'is_eligible_for_certificate' ] == false && score >= exam.passingScore ) {

                        const courseDoc = await courseService.get( progressDoc.course );

                        progressDoc[ 'is_eligible_for_certificate' ] = true;
                        progressDoc[ 'completion_date' ] = Date.now();

                        courseDoc[ 'completed_users' ].set( socket.userDoc._id.toString(), true );
                        courseDoc[ 'on_going_users' ].delete( socket.userDoc._id.toString() );

                        socket.userDoc[ 'completed_courses' ].set( progressDoc[ 'course' ].toString(), 'true' );
                        socket.userDoc[ 'on_going_courses' ].delete( progressDoc[ 'course' ].toString() );

                        
                        socket.userDoc.markModified( 'progress_array' );
                        socket.userDoc.markModified( 'completed_courses' );
                        socket.userDoc.markModified( 'completed_courses' );
                        
                        courseDoc.save();
                        socket.userDoc.save();
                        courseProgressStatsService.update( { 'course': courseDoc[ '_id' ].toString(), 'learner': socket.userDoc[ '_id' ].toString(), 'owner': courseDoc[ 'owner_id' ].toString() }, { 'status': 'COMPLETED' } );
                        notificationController.insertCourseCompletionNotification(socket.userDoc['_id'].toString(),courseDoc['_id'].toString());
                    }

                    socket.disconnect();
                    return;
                }


                exam.currentQuestion += 1;


            }else{
                socket.emit( 'message', 'you aint taking any exam' );

            }

        
        }
        );


    }
    );

};

module.exports = { setQuizSocketHandlers };
