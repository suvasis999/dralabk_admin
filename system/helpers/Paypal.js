const paypal = require( '@paypal/checkout-server-sdk' );

// for paypal configuration
const getClient = () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    let environment;

    if ( process.env.NODE_ENV === 'production' ) {
        environment = new paypal.core.LiveEnvironment( clientId, clientSecret );
    } else {
        environment = new paypal.core.SandboxEnvironment( clientId, clientSecret );
    }
    const client = new paypal.core.PayPalHttpClient( environment );

    return client;
};

// Call API with your client and get a response for your call

const createOrder = async function( amount, currency, itemName, quantity, category ) {
    const client = getClient();
    // Construct a request object and set desired parameters
    // Here, OrdersCreateRequest() creates a POST request to /v2/checkout/orders
    const request = new paypal.orders.OrdersCreateRequest();

    // If we need more object while sending request refer to below example
    // https://github.com/paypal/Checkout-NodeJS-SDK/blob/develop/samples/CaptureIntentExamples/createOrder.js
    request.requestBody( {
        intent: 'CAPTURE',
        purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount,
                breakdown: {
                  item_total: {
                    currency_code: currency,
                    value: amount,
                    /*
                     * If you have a item_total key, make sure that:
                     *  
                     *  item_total.value = sum of (items[].unit_amount * items[].quantity)  
                     */

              },
            },
          },
          items: [
            {
              name: itemName,
              unit_amount: {
                currency_code: currency,
                value: amount,
              },
              quantity: quantity,
              /* 
               * category is an ENUM with following possible values:
               *    DIGITAL_GOODS, 
               *    PHYSICAL_GOODS,
               *    DONATION
               * 
               * More Details here: https://developer.paypal.com/docs/api/orders/v2/#:~:text=possible%20values%20are%3A-,DIGITAL_GOODS,-.%20Goods%20that%20are 
               * 
               */
              category: category,
            },
          ],
          description: "aloha"
            },

      ],
    }
    );

    const response = await client.execute( request );

    return response;
};
 
// this function get payment details
const fetchPayment = async function( paymentId ) {
    try {
        const client = getClient();
        const requestPayment = new paypal.payments.CapturesGetRequest( paymentId );
        const responsePayment = await client.execute( requestPayment );
        
        return responsePayment;
    } catch ( err ) {
        console.log( {
          level: "error",
          message: "Error while fetching payment : ",
          metadata: { paymentId, err },
        }

        );
        return { statusCode: '500', status: 'ERROR', error: err };
    }
};

// this function get order details
const fetchOrder = async function ( orderId ) {
    // From payment details object verify if the order was captured successfully or it's tampered
    try {
        const client = getClient();
        const requestCapture = new paypal.orders.OrdersGetRequest(orderId);
        const responseCapture = await client.execute(requestCapture);
    
        return {
            statusCode: responseCapture.statusCode,
            status: responseCapture.result.status,
        };

    } catch ( err ) {
        console.log({
          level: "error",
          message: "Error while fetching order : ",
          metadata: { orderId, err },
        }
        );
        return { statusCode: "500", status: "PENDING" };
    }
};

module.exports = { fetchOrder, fetchPayment, createOrder };
