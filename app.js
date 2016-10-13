'use strict';

const pm2 = require('pm2');
const pmx = require('pmx');
const elasticsearch = require('elasticsearch');

const packageJSON =  require('./package');
const conf = pmx.initModule();
let elastiCclient = new elasticsearch.Client({
    host: conf.elasticsearch_host,
    //  log: 'trace'
});
/**
 * Change default host to elasticsearch : pm2 set pm2-logstash:elasticsearch_host 'http://localhost:9200'
 *
 *   Start module in development mode
 *          $ pm2 install .
 */

pm2.Client.launchBus(function(err, bus) {
    if(err)
        return console.error(err);
    bus.on('log:*', function(type, packet) {
        if ((conf.app_name != 'all' && conf.app_name && conf.app_name != packet.process.name) || packet.process.name === packageJSON.name) return false;

        if (typeof(packet.data) == 'string')
            packet.data = packet.data.replace(/(\r\n|\n|\r)/gm,'');
        elasticLib.create({
            message : packet.data,
            application : packet.process.name,
            process_id : packet.process.pm_id,
        }).catch((e) => {console.error(e)});
    });
});


class ElasticLib {
    constructor(host, index){
        this.elasticClient = new elasticsearch.Client({
            host: host || 'http://localhost:9200',
        });
        this.index = index || 'logs';
        this.types = ['logs'];
        this.createIndex();
    }

    createIndex(){
        /**
         * Create index and mapping if index no exist
         */
        return elastiCclient.indices.exists({index:this.index})
        .then(responseExist => {
            if(responseExist === true)
                return;
            return elastiCclient.indices.create({
                index: this.index
            }).then(() => {
                return Promise.all(this.types.map(type => {
                    return this.existType(type)
                        .then(response => {
                            if(response === false)
                                return this.createType(type);
                            return;
                        })
                }));
            });
        }).catch(error => {
            console.log(error);
        });
    }

    /**
     * Check exist type
     */
    existType (type){
        return elastiCclient.indices.existsType({index:this.index, type : type});
    }

    /**
     * Create type
     * @param name
     * @returns {*}
     */
    createType(name){
        let body = {
            "_routing" : {
                "required": false
            },
            properties:{
                added  : { "type" : "date" },
            }
        }
        return elastiCclient.indices.putMapping({index: this.index, type: name, body: body});
    }

    /**
     * Create fields to search
     * @param type
     * @param id
     * @param body
     * @param cb
     */
    create(body, type='logs') {
        console.log(body);
        body.added = new Date();
        return elastiCclient.create({
            index: this.index,
            type: type,
            body: body
        });
    }
}

let elasticLib = new ElasticLib(conf.elasticsearch_host, conf.elasticsearch_index);
