var ERR = require('async-stacktrace');
var _ = require('lodash');
var path = require('path');
var csvStringify = require('csv').stringify;
var express = require('express');
var router = express.Router();

var logger = require('../../logger');
var sqldb = require('../../sqldb');
var sqlLoader = require('../../sql-loader');

var sql = sqlLoader.load(path.join(__dirname, 'adminTests.sql'));

var csvFilename = function(locals) {
    return locals.course.short_name.replace(/\s+/g, '')
        + '_'
        + locals.courseInstance.short_name
        + '_'
        + 'test_stats.csv';
};

router.get('/', function(req, res, next) {
    var params = {course_instance_id: res.locals.courseInstanceId};
    sqldb.query(sql.all, params, function(err, result) {
        if (ERR(err, next)) return;
        
        res.locals.rows = result.rows;
        res.locals.csvFilename = csvFilename(res.locals);
        res.render(path.join(__dirname, 'adminTests'), res.locals);
    });
});

router.get('/:filename', function(req, res, next) {
    if (req.params.filename == csvFilename(res.locals)) {
        var params = {course_instance_id: res.locals.courseInstanceId};
        sqldb.query(sql.all, params, function(err, result) {
            if (ERR(err, next)) return;
            var csvHeaders = ['Course', 'Instance', 'Set', 'Number', 'Test', 'Title', 'TID',
                              'NStudents', 'Mean', 'Std', 'Min', 'Max', 'Median',
                              'NZero', 'NHundred', 'NZeroPerc', 'NHundredPerc',
                              'Hist1', 'Hist2', 'Hist3', 'Hist4', 'Hist5',
                              'Hist6', 'Hist7', 'Hist8', 'Hist9', 'Hist10'];
            var csvData = [];
            _(testStats).each(function(testStat) {
                var csvRow = [
                    res.locals.course.short_name,
                    res.locals.courseInstance.short_name,
                    testStat.long_name,
                    testStat.test_number,
                    testStat.label,
                    testStat.title,
                    testStat.tid,
                    testStat.number,
                    testStat.mean,
                    testStat.std,
                    testStat.min,
                    testStat.max,
                    testStat.median,
                    testStat.n_zero,
                    testStat.n_hundred,
                    testStat.n_zero_perc,
                    testStat.n_hundred_perc,
                ];
                csvRow = csvRow.concat(testStat.score_hist);
                csvData.push(csvRow);
            });
            csvData.splice(0, 0, csvHeaders);
            csvStringify(csvData, function(err, csv) {
                if (err) throw Error("Error formatting CSV", err);
                res.attachment(req.params.filename);
                res.send(csv);
            });
        });
    } else {
        throw Error("Unknown filename: " + req.params.filename);
    }
});

module.exports = router;