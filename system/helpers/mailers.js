const nodemailer = require( 'nodemailer' );

const mailerConfiguration = {
    port: 465,
    host: "smtp.titan.email",
               auth: {
                    user: 'admin@spiritoftruthnativeamericanchurch.org',
                    pass: '4DA*&aH6*@9Z',
                 },
    secure: true,
                }
class Mailer {

    constructor( { port, host, auth, secure } ) {
        this.port = port;
        this.host = host;
        this.user = auth.user;
        this.pass = auth.pass;
        this.isSecure = secure;
        this.transporter = undefined;
    }


    build() {
        if(typeof this.transporter != 'undefined') return this;
        
        this.transporter = nodemailer.createTransport( {
            port: this.port,
            host: this.host,
               auth: {
                    user: this.user,
                    pass: this.pass,
                 },
            secure: this.isSecure,
            } );

        return this;

    }

    async sendMail(mailOptions) {
        return await this.wrapedSendMail( mailOptions );
    }

    async wrapedSendMail(mailOptions) {
        return new Promise( ( resolve, reject )=> {
    
        this.transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log("error is "+ error);
            resolve(false); // or use rejcet(false) but then you will have to handle errors
        } 
        else {
           console.log('Email sent: ' + info.response);
           resolve(true);
        }

       });
       
    })
    }

    static instance;

    static getInstance() {
        if(Mailer.instance){
            return Mailer.instance
        }else{
            Mailer.instance = new Mailer(mailerConfiguration);
            return Mailer.instance;
        }   
    }

}

const mailer = Mailer.getInstance().build();

module.exports = { mailer}
