'use strict';
const { Service } = require( '../../system/services/Service' );
const { Media } = require( '../models/Media');
const fs = require( 'fs' );

class MediaService extends Service {
    constructor( model ) {
        super( model );
    }
    
    async deleteUnlinkedUserItems( userId ) {
        const itemsToDeleteIds = await this.model.find( { 'uploader_id': userId.toString(), 'status': 'unlinked' } ).distinct( '_id' );
        
        for ( const itemToDeleteId of itemsToDeleteIds ) {
            const response = await this.delete( itemToDeleteId );

            console.log( 'deleting item: ', itemToDeleteId );
        }
    }

    
    async linkImage( imageId ) {
        await this.update( imageId, { 'status': 'linked' } );
    }
    async unLinkImage( imageId ) {
        await this.update( imageId, { 'status': 'linked' } );
    }


    async delete( id ) {

        try {
            const response = await super.delete( id );
            // File Unlinking..

            if ( response.data.path ) {
                console.log( 'unlink item', response.data.path );
                fs.unlink( response.data.path, ( err ) => {
                    if ( err ) {
                        console.log( 'error deleting file' );
                        throw err;
                    }
                    console.log( 'File deleted!' );
                } );
            }
            return response;
        } catch ( error ) {
            throw error;
        }
    }
    
}

const mediaService = new MediaService( Media );

module.exports = { MediaService, mediaService };
